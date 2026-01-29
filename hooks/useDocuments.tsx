import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Document, DocumentType } from '@/types/database';

// Sanitize filename for Supabase Storage compatibility
const sanitizeFileName = (fileName: string): string => {
  return fileName
    .normalize('NFD')                          // Decompose accents
    .replace(/[\u0300-\u036f]/g, '')           // Remove diacritics
    .replace(/\s+/g, '_')                      // Spaces → underscores
    .replace(/[^a-zA-Z0-9._-]/g, '')           // Keep only safe characters
    .replace(/_+/g, '_');                      // Avoid multiple underscores
};

export function useDocuments(companyId: string | undefined) {
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: ['documents', companyId],
    queryFn: async (): Promise<Document[]> => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', companyId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, type, versionLabel }: { file: File; type: DocumentType; versionLabel?: string }) => {
      if (!companyId) throw new Error('No company selected');

      // Sanitize filename for storage compatibility (accents, spaces, special chars)
      const safeFileName = sanitizeFileName(file.name);
      const filePath = `${companyId}/${Date.now()}_${safeFileName}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from('documents')
        .insert({
          company_id: companyId,
          type,
          file_path: filePath,
          file_name: file.name,
          version_label: versionLabel || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', companyId] });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const doc = documentsQuery.data?.find(d => d.id === documentId);
      if (doc) {
        await supabase.storage.from('documents').remove([doc.file_path]);
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', companyId] });
    },
  });

  const getDocumentUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600);
    return data?.signedUrl;
  };

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    error: documentsQuery.error,
    uploadDocument: uploadDocumentMutation.mutateAsync,
    deleteDocument: deleteDocumentMutation.mutateAsync,
    isUploading: uploadDocumentMutation.isPending,
    getDocumentUrl,
  };
}

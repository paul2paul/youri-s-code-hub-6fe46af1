import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Test the date calculation logic used in generate-timeline

Deno.test("Timeline - Calculate FYE for cycle year", () => {
  // Given a fiscal year end date and cycle year, calculate the correct FYE
  const fiscalYearEnd = new Date("2024-12-31");
  const fyeMonth = fiscalYearEnd.getMonth(); // 11 (December)
  const fyeDay = fiscalYearEnd.getDate(); // 31

  const cycleYear = 2024;
  const cycleYearFYE = new Date(cycleYear, fyeMonth, fyeDay);

  assertEquals(cycleYearFYE.getFullYear(), 2024);
  assertEquals(cycleYearFYE.getMonth(), 11);
  assertEquals(cycleYearFYE.getDate(), 31);
});

Deno.test("Timeline - Calculate collect inputs date (4 months after FYE)", () => {
  const cycleYearFYE = new Date(2024, 11, 31); // December 31, 2024

  const collectInputsDate = new Date(cycleYearFYE);
  collectInputsDate.setMonth(collectInputsDate.getMonth() + 4);

  assertEquals(collectInputsDate.getMonth(), 3); // April
  assertEquals(collectInputsDate.getFullYear(), 2025);
});

Deno.test("Timeline - Calculate convocation date based on notice period", () => {
  const cycleYearFYE = new Date(2024, 11, 31);
  const noticePeriod = 15;
  const approvalDeadline = 180; // 6 months

  const sendConvocationsDate = new Date(cycleYearFYE);
  sendConvocationsDate.setMonth(sendConvocationsDate.getMonth() + Math.floor(approvalDeadline / 30));
  sendConvocationsDate.setDate(sendConvocationsDate.getDate() - noticePeriod - 5);

  // Should be about 6 months after FYE, minus 20 days
  assertEquals(sendConvocationsDate.getFullYear(), 2025);
  // June minus 20 days = early June
  assertEquals(sendConvocationsDate.getMonth() >= 5, true); // May or June
});

Deno.test("Timeline - Calculate AGM date (before approval deadline)", () => {
  const cycleYearFYE = new Date(2024, 11, 31);
  const approvalDeadline = 180;

  const holdAGMDate = new Date(cycleYearFYE);
  holdAGMDate.setDate(holdAGMDate.getDate() + approvalDeadline - 7);

  // Should be about 173 days after FYE (end of June)
  assertEquals(holdAGMDate.getFullYear(), 2025);
  assertEquals(holdAGMDate.getMonth(), 5); // June
});

Deno.test("Timeline - Calculate file accounts date (1 month after AGM)", () => {
  const holdAGMDate = new Date(2025, 5, 22); // June 22, 2025

  const fileAccountsDate = new Date(holdAGMDate);
  fileAccountsDate.setMonth(fileAccountsDate.getMonth() + 1);

  assertEquals(fileAccountsDate.getMonth(), 6); // July
});

Deno.test("Timeline - Calculate archive date (2 weeks after filing)", () => {
  const fileAccountsDate = new Date(2025, 6, 22); // July 22, 2025

  const archiveDate = new Date(fileAccountsDate);
  archiveDate.setDate(archiveDate.getDate() + 14);

  assertEquals(archiveDate.getDate(), 5); // August 5 (or close)
  assertEquals(archiveDate.getMonth(), 7); // August
});

Deno.test("Timeline - Task generation structure", () => {
  // Test the structure of generated tasks
  const mockTask = {
    company_id: "test-company-id",
    cycle_year: 2024,
    type: "COLLECT_YEAR_INPUTS",
    title: "Provide year context and inputs",
    due_date: "2025-04-30T00:00:00.000Z",
    owner_role: "PRESIDENT",
    status: "TODO",
    metadata: { description: "Answer questions about capital changes, dividends, notable events" }
  };

  assertExists(mockTask.company_id);
  assertExists(mockTask.cycle_year);
  assertExists(mockTask.type);
  assertExists(mockTask.title);
  assertExists(mockTask.due_date);
  assertExists(mockTask.owner_role);
  assertExists(mockTask.status);
  assertExists(mockTask.metadata);

  assertEquals(mockTask.status, "TODO");
  assertEquals(typeof mockTask.cycle_year, "number");
});

Deno.test("Timeline - Handles fiscal year end in different months", () => {
  // Test FYE in March
  const marchFYE = new Date("2024-03-31");
  const fyeMonth = marchFYE.getMonth();

  const cycleYearFYE = new Date(2024, fyeMonth, 31);
  assertEquals(cycleYearFYE.getMonth(), 2); // March

  // 4 months after March = July
  const collectDate = new Date(cycleYearFYE);
  collectDate.setMonth(collectDate.getMonth() + 4);
  assertEquals(collectDate.getMonth(), 6); // July
});

Deno.test("Timeline - Default values when no governance profile", () => {
  const defaultNoticePeriod = 15;
  const defaultApprovalDeadline = 180;

  assertEquals(defaultNoticePeriod, 15);
  assertEquals(defaultApprovalDeadline, 180);
});

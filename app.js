const MONTHS = Array.from({ length: 12 }, (_, index) => `${index + 1}月`);
const STORAGE_KEY = "rent-management-data-v1";
const SIDEBAR_STORAGE_KEY = "rent-management-sidebar-collapsed";
const REMITTANCE_STORAGE_KEY = "rent-management-remittance-profiles";

const initialData = window.RENTAL_INITIAL_DATA || createEmptyInitialData();

function createEmptyInitialData() {
  const year = String(new Date().getFullYear());
  return { [year]: [] };
}

let state = loadState();
let currentYear = Object.keys(state).sort().at(-1);
let currentMonth = `${new Date().getMonth() + 1}月`;
let activeStatus = "all";
let activeView = "dashboard";

const els = {
  yearSelect: document.querySelector("#yearSelect"),
  monthSelect: document.querySelector("#monthSelect"),
  pageTitle: document.querySelector("#pageTitle"),
  topbarToolbar: document.querySelector("#topbarToolbar"),
  expectedRent: document.querySelector("#expectedRent"),
  paidCount: document.querySelector("#paidCount"),
  openCount: document.querySelector("#openCount"),
  yearCollected: document.querySelector("#yearCollected"),
  loginScreen: document.querySelector("#loginScreen"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  loginMessage: document.querySelector("#loginMessage"),
  statusSubtitle: document.querySelector("#statusSubtitle"),
  statusList: document.querySelector("#statusList"),
  monthBars: document.querySelector("#monthBars"),
  paymentSearch: document.querySelector("#paymentSearch"),
  paymentPrintMeta: document.querySelector("#paymentPrintMeta"),
  paymentTable: document.querySelector("#paymentTable"),
  propertyCards: document.querySelector("#propertyCards"),
  authState: document.querySelector("#authState"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  newPassword: document.querySelector("#newPassword"),
  confirmPassword: document.querySelector("#confirmPassword"),
  authMessage: document.querySelector("#authMessage"),
  organizationState: document.querySelector("#organizationState"),
  inviteEmail: document.querySelector("#inviteEmail"),
  inviteRole: document.querySelector("#inviteRole"),
  teamMessage: document.querySelector("#teamMessage"),
  appShell: document.querySelector("#appShell"),
  sidebarToggle: document.querySelector("#sidebarToggle"),
  settlementAddress: document.querySelector("#settlementAddress"),
  settlementTenant: document.querySelector("#settlementTenant"),
  settlementRent: document.querySelector("#settlementRent"),
  settlementDeposit: document.querySelector("#settlementDeposit"),
  settlementMonth: document.querySelector("#settlementMonth"),
  moveOutDate: document.querySelector("#moveOutDate"),
  prepaidRent: document.querySelector("#prepaidRent"),
  unpaidRent: document.querySelector("#unpaidRent"),
  damageFee: document.querySelector("#damageFee"),
  otherFee: document.querySelector("#otherFee"),
  utilityBillStatus: document.querySelector("#utilityBillStatus"),
  utilityStart: document.querySelector("#utilityStart"),
  utilityEnd: document.querySelector("#utilityEnd"),
  electricBillTotal: document.querySelector("#electricBillTotal"),
  waterBillTotal: document.querySelector("#waterBillTotal"),
  sharedOtherFee: document.querySelector("#sharedOtherFee"),
  splitMode: document.querySelector("#splitMode"),
  tenantSplitTable: document.querySelector("#tenantSplitTable"),
  settlementSummary: document.querySelector("#settlementSummary"),
  tenantSplitResult: document.querySelector("#tenantSplitResult"),
  billType: document.querySelector("#billType"),
  savedBillSelect: document.querySelector("#savedBillSelect"),
  billAddress: document.querySelector("#billAddress"),
  billYear: document.querySelector("#billYear"),
  billMonth: document.querySelector("#billMonth"),
  billDueDate: document.querySelector("#billDueDate"),
  billBank: document.querySelector("#billBank"),
  billAccount: document.querySelector("#billAccount"),
  billPayee: document.querySelector("#billPayee"),
  newBillBank: document.querySelector("#newBillBank"),
  newBillAccount: document.querySelector("#newBillAccount"),
  newBillPayee: document.querySelector("#newBillPayee"),
  billElectricTotal: document.querySelector("#billElectricTotal"),
  billWaterTotal: document.querySelector("#billWaterTotal"),
  billNote: document.querySelector("#billNote"),
  billTenantTable: document.querySelector("#billTenantTable"),
  billTenantSource: document.querySelector("#billTenantSource"),
  billReportTitle: document.querySelector("#billReportTitle"),
  billReportAddress: document.querySelector("#billReportAddress"),
  billReportPeriod: document.querySelector("#billReportPeriod"),
  billSummaryBand: document.querySelector("#billSummaryBand"),
  billReportElectric: document.querySelector("#billReportElectric"),
  billReportWater: document.querySelector("#billReportWater"),
  billReportNote: document.querySelector("#billReportNote"),
  billShareTableSection: document.querySelector("#billShareTableSection"),
  billShareTableBody: document.querySelector("#billShareTableBody"),
  billExcelReport: document.querySelector("#billExcelReport"),
  billTenantCards: document.querySelector("#billTenantCards"),
  billReportBank: document.querySelector("#billReportBank"),
  billElectricLabel: document.querySelector("#billElectricLabel"),
  billWaterLabel: document.querySelector("#billWaterLabel"),
  billExplainTitle: document.querySelector("#billExplainTitle"),
  billExplainText: document.querySelector("#billExplainText"),
  dialog: document.querySelector("#editDialog"),
  editForm: document.querySelector("#editForm"),
  dialogLabel: document.querySelector("#dialogLabel"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogFields: document.querySelector("#dialogFields")
};

const supabaseConfig = window.RENTAL_SUPABASE_CONFIG || {};
const supabaseClient = window.supabase && supabaseConfig.url && supabaseConfig.anonKey
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;
let supabaseSession = null;
let currentOrganization = null;
let currentOrgRole = "";

let utilityTenants = [
  { name: "退租租客", start: "", end: "", charge: "tenant", electricPrevious: 0, electricCurrent: 0, waterPrevious: 0, waterCurrent: 0 },
  { name: "其他租客", start: "", end: "", charge: "tenant", electricPrevious: 0, electricCurrent: 0, waterPrevious: 0, waterCurrent: 0 }
];

let billTenants = [
  { unit: "11樓之一", tenant: "", rent: 8000, other: 0, electricPrevious: 0, electricCurrent: 0, waterPrevious: 0, waterCurrent: 0 },
  { unit: "11樓之二", tenant: "", rent: 8500, other: 0, electricPrevious: 0, electricCurrent: 0, waterPrevious: 0, waterCurrent: 0 }
];
let billPeriodOverride = "";
let billAddressOverride = "";
let savedTenantBills = [];

let remittanceProfiles = loadRemittanceProfiles();

els.settlementMonth.value = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

function emptyPayments() {
  return Object.fromEntries(MONTHS.map((month) => [month, ""]));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(initialData);
  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(initialData);
  }
}

function loadRemittanceProfiles() {
  const saved = localStorage.getItem(REMITTANCE_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {}
  }
  return [{ bank: "", payee: "", account: "" }];
}

function persistRemittanceProfiles() {
  localStorage.setItem(REMITTANCE_STORAGE_KEY, JSON.stringify(remittanceProfiles));
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  return Number(value || 0).toLocaleString("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 });
}

function numberValue(element) {
  return Number(element?.value || 0);
}

function dateValue(value) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function inclusiveDays(start, end) {
  if (!start || !end || end < start) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86400000) + 1;
}

function laterDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function earlierDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

function daysInMonth(monthValue) {
  if (!monthValue) return 30;
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function monthStart(monthValue) {
  if (!monthValue) return null;
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function formatDateInput(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function billPeriodText() {
  return billPeriodOverride || `${els.billYear.value}年${Number(els.billMonth.value)}月`;
}

function getRows() {
  return state[currentYear] || [];
}

function isPaid(value) {
  return Boolean(String(value || "").trim());
}

function isSpecial(value) {
  return /退租|維修|折抵|押|仲介/.test(String(value || ""));
}

function accountParts(value) {
  return String(value || "")
    .split(/[\s,，、/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function accountBadges(value) {
  const parts = accountParts(value);
  if (!parts.length) return `<span class="account-chip empty">未填</span>`;
  return parts.map((part) => `<span class="account-chip">${escapeHtml(part)}</span>`).join("");
}

function dueDay(cycle) {
  const match = String(cycle || "").match(/(\d{1,2})日/);
  return match ? Number(match[1]) : null;
}

function paymentStatus(row, month) {
  const value = row.payments[month] || "";
  if (isSpecial(value)) return { key: "special", label: value };
  if (isPaid(value)) return { key: "paid", label: "已收" };

  const monthNumber = Number(month.replace("月", ""));
  const today = new Date();
  const selectedDate = new Date(Number(currentYear), monthNumber - 1, dueDay(row.cycle) || 28);
  const isPastDue = today > selectedDate && Number(currentYear) <= today.getFullYear();
  return isPastDue ? { key: "attention", label: "逾期" } : { key: "pending", label: "未收" };
}

function expectedThisMonth(rows, month) {
  return rows.reduce((sum, row) => sum + Number(row.rent || 0), 0);
}

function collectedThisYear(rows) {
  return rows.reduce((sum, row) => {
    return sum + MONTHS.reduce((monthSum, month) => monthSum + (isPaid(row.payments[month]) && !isSpecial(row.payments[month]) ? Number(row.rent || 0) : 0), 0);
  }, 0);
}

function renderSelectors() {
  els.yearSelect.innerHTML = Object.keys(state)
    .sort()
    .map((year) => `<option value="${year}">${year}</option>`)
    .join("");
  els.yearSelect.value = currentYear;
  els.monthSelect.innerHTML = MONTHS.map((month) => `<option value="${month}">${month}</option>`).join("");
  els.monthSelect.value = currentMonth;
}

function renderBillControls() {
  const currentAddress = els.billAddress.value;
  const rows = getRows();
  const addressOptions = rows
    .map((row, index) => `<option value="${index}">${escapeHtml(row.address)}${row.tenant ? ` · ${escapeHtml(row.tenant)}` : ""}</option>`)
    .join("");
  els.billAddress.innerHTML = addressOptions || `<option value="">沒有物件資料</option>`;
  if (currentAddress && [...els.billAddress.options].some((option) => option.value === currentAddress)) {
    els.billAddress.value = currentAddress;
  }

  const currentBillYear = els.billYear.value || currentYear;
  els.billYear.innerHTML = Object.keys(state).sort().map((year) => `<option value="${year}">${year}</option>`).join("");
  els.billYear.value = [...els.billYear.options].some((option) => option.value === currentBillYear) ? currentBillYear : currentYear;

  const currentBillMonth = els.billMonth.value || String(new Date().getMonth() + 1);
  els.billMonth.innerHTML = MONTHS.map((month, index) => `<option value="${index + 1}">${month}</option>`).join("");
  els.billMonth.value = currentBillMonth;

  renderRemittanceOptions();
  renderBillTenantSource();
  renderSavedBillOptions();
  applyBillPropertyDefaults(false);
  updateBillDueDate();
}

function renderSavedBillOptions() {
  const current = els.savedBillSelect.value;
  els.savedBillSelect.innerHTML = savedTenantBills.length
    ? savedTenantBills.map((bill, index) => `<option value="${index}">${escapeHtml(savedBillLabel(bill))}</option>`).join("")
    : `<option value="">尚無已存帳單</option>`;
  if (current && [...els.savedBillSelect.options].some((option) => option.value === current)) {
    els.savedBillSelect.value = current;
  }
}

function savedBillLabel(bill) {
  const type = bill.bill_type === "shared" ? "分錶" : "簡易";
  return `${bill.bill_year}年${bill.bill_month}月 · ${type} · ${bill.address || "未填地址"}`;
}

function utilityPeriodPayload(item) {
  return {
    organization_id: currentOrganization?.id,
    address: item.address || "",
    period_year: Number(item.periodYear || 0),
    period_month: Number(item.periodMonth || 1),
    period_label: item.period || "",
    official_electric_total: Math.round(Number(item.electricBillTotal || 0)),
    official_water_total: Math.round(Number(item.waterBillTotal || 0)),
    notes: [item.originalPeriod, item.sourceSheet].filter(Boolean).join(" / ")
  };
}

function utilityReadingPayload(tenant, periodId) {
  return {
    organization_id: currentOrganization?.id,
    utility_period_id: periodId,
    unit_label: tenant.unit || "",
    tenant_name: tenant.tenant || "",
    rent_amount: Math.round(Number(tenant.rent || 0)),
    other_amount: Math.round(Number(tenant.other || 0)),
    electric_previous: Number(tenant.electricPrevious || 0),
    electric_current: Number(tenant.electricCurrent || 0),
    electric_usage: Number(tenant.electricUsage || Math.max(Number(tenant.electricCurrent || 0) - Number(tenant.electricPrevious || 0), 0)),
    electric_fee: Math.round(Number(tenant.electricFee || 0)),
    water_previous: Number(tenant.waterPrevious || 0),
    water_current: Number(tenant.waterCurrent || 0),
    water_usage: Number(tenant.waterUsage || Math.max(Number(tenant.waterCurrent || 0) - Number(tenant.waterPrevious || 0), 0)),
    water_fee: Math.round(Number(tenant.waterFee || 0)),
    total_due: Math.round(Number(tenant.totalDue || 0))
  };
}

function utilityHistoryFromCloud(period) {
  const tenants = [...(period.utility_readings || [])]
    .sort((a, b) => String(a.unit_label || "").localeCompare(String(b.unit_label || ""), "zh-Hant"))
    .map((tenant) => ({
      unit: tenant.unit_label || "",
      tenant: tenant.tenant_name || "",
      rent: Number(tenant.rent_amount || 0),
      other: Number(tenant.other_amount || 0),
      electricPrevious: Number(tenant.electric_previous || 0),
      electricCurrent: Number(tenant.electric_current || 0),
      electricUsage: Number(tenant.electric_usage || 0),
      electricFee: Number(tenant.electric_fee || 0),
      waterPrevious: Number(tenant.water_previous || 0),
      waterCurrent: Number(tenant.water_current || 0),
      waterUsage: Number(tenant.water_usage || 0),
      waterFee: Number(tenant.water_fee || 0),
      totalDue: Number(tenant.total_due || 0)
    }));
  return {
    id: period.id,
    address: period.address || "",
    period: period.period_label || `${period.period_year}年${period.period_month}月`,
    periodYear: Number(period.period_year || 0),
    periodMonth: Number(period.period_month || 1),
    electricBillTotal: Number(period.official_electric_total || 0),
    waterBillTotal: Number(period.official_water_total || 0),
    tenants
  };
}

function utilityHistoryBillFromCloud(period) {
  const history = utilityHistoryFromCloud(period);
  return {
    id: `utility:${history.id}`,
    source: "utility_history",
    bill_type: "shared",
    address: history.address,
    bill_year: history.periodYear,
    bill_month: history.periodMonth,
    due_date: period.due_date || null,
    utility_period_id: history.id,
    note: period.notes || "",
    officialElectricTotal: history.electricBillTotal,
    officialWaterTotal: history.waterBillTotal,
    tenant_bill_items: history.tenants.map((tenant, index) => ({
      id: `utility:${history.id}:${index}`,
      unit_label: tenant.unit || "",
      tenant_name: tenant.tenant || "",
      rent_amount: Math.round(Number(tenant.rent || 0)),
      electric_fee: Math.round(Number(tenant.electricFee || 0)),
      water_fee: Math.round(Number(tenant.waterFee || 0)),
      other_amount: Math.round(Number(tenant.other || 0)),
      total_due: Math.round(Number(tenant.totalDue || 0)),
      meter_snapshot: {
        electricPrevious: Number(tenant.electricPrevious || 0),
        electricCurrent: Number(tenant.electricCurrent || 0),
        electricUsage: Number(tenant.electricUsage || 0),
        waterPrevious: Number(tenant.waterPrevious || 0),
        waterCurrent: Number(tenant.waterCurrent || 0),
        waterUsage: Number(tenant.waterUsage || 0),
        officialElectricTotal: history.electricBillTotal,
        officialWaterTotal: history.waterBillTotal
      }
    }))
  };
}

async function importUtilityHistoryToCloud() {
  if (!canSyncCloud()) {
    setCloudMessage("請先登入 Supabase。");
    return;
  }
  const history = window.utilityHistory || [];
  if (!history.length) {
    setCloudMessage("目前沒有本機歷史水電資料可匯入。");
    return;
  }
  if (!window.confirm("這會清除你帳號目前雲端的水電帳期與分錶讀數，再匯入本機歷史水電資料。確定繼續？")) return;

  setCloudMessage("正在匯入歷史水電資料...");
  const { error: deleteReadingsError } = await supabaseClient.from("utility_readings").delete().eq("organization_id", currentOrganization.id);
  if (handleCloudError(deleteReadingsError, "清除雲端分錶讀數")) return;
  const { error: deletePeriodsError } = await supabaseClient.from("utility_periods").delete().eq("organization_id", currentOrganization.id);
  if (handleCloudError(deletePeriodsError, "清除雲端水電帳期")) return;

  const periodPayloads = history.map(utilityPeriodPayload);
  const { data: periods, error: periodError } = await supabaseClient
    .from("utility_periods")
    .insert(periodPayloads)
    .select("id,period_year,period_month,address");
  if (handleCloudError(periodError, "匯入水電帳期")) return;

  const readingPayloads = [];
  periods.forEach((period, index) => {
    (history[index]?.tenants || []).forEach((tenant) => {
      readingPayloads.push(utilityReadingPayload(tenant, period.id));
    });
  });
  if (readingPayloads.length) {
    const { error: readingError } = await supabaseClient.from("utility_readings").insert(readingPayloads);
    if (handleCloudError(readingError, "匯入分錶讀數")) return;
  }

  setCloudMessage(`已匯入 ${periods.length} 個水電帳期、${readingPayloads.length} 筆分錶讀數。`);
}

async function loadUtilityHistoryFromCloud({ quiet = false } = {}) {
  if (!canSyncCloud()) return;
  const { data, error } = await supabaseClient
    .from("utility_periods")
    .select("*, utility_readings(*)")
    .eq("organization_id", currentOrganization.id)
    .order("period_year", { ascending: true })
    .order("period_month", { ascending: true });
  if (handleCloudError(error, "載入歷史水電")) return;

  if (!data.length) {
    if (!quiet) setCloudMessage("雲端目前沒有歷史水電資料。");
    return;
  }

  window.utilityHistory = data.map(utilityHistoryFromCloud);
  if (!quiet) setCloudMessage(`已從雲端載入 ${data.length} 個水電帳期。`);
}

function tenantBillPayload() {
  const profile = currentRemittanceProfile();
  return {
    organization_id: currentOrganization?.id,
    bill_type: els.billType.value,
    address: billAddressOverride || selectedBillProperty()?.address || "",
    bill_year: Number(els.billYear.value || currentYear),
    bill_month: Number(els.billMonth.value || 1),
    due_date: els.billDueDate.value || null,
    remittance_profile_id: profile.id || null,
    note: els.billNote.value || ""
  };
}

function tenantBillItemPayload(row, billId) {
  const property = getRows().find((item) => item.address === row.unit || item.tenant === row.tenant);
  return {
    organization_id: currentOrganization?.id,
    tenant_bill_id: billId,
    property_id: property?.id || null,
    unit_label: row.unit || "",
    tenant_name: row.tenant || "",
    rent_amount: Math.round(Number(row.rent || 0)),
    electric_fee: Math.round(Number(row.electricFee || 0)),
    water_fee: Math.round(Number(row.waterFee || 0)),
    other_amount: Math.round(Number(row.other || 0)),
    total_due: Math.round(Number(row.total || 0)),
    meter_snapshot: {
      electricPrevious: Number(row.electricPrevious || 0),
      electricCurrent: Number(row.electricCurrent || 0),
      electricUsage: Number(row.electricUsage || 0),
      waterPrevious: Number(row.waterPrevious || 0),
      waterCurrent: Number(row.waterCurrent || 0),
      waterUsage: Number(row.waterUsage || 0),
      officialElectricTotal: numberValue(els.billElectricTotal),
      officialWaterTotal: numberValue(els.billWaterTotal)
    }
  };
}

async function saveTenantBillToCloud() {
  if (!canSyncCloud()) {
    setCloudMessage("請先登入 Supabase。");
    return;
  }
  const rows = calculateBillRows();
  if (!rows.length) {
    setCloudMessage("目前沒有帳單明細可儲存。");
    return;
  }
  setCloudMessage("正在儲存租客帳單...");
  const { data: bill, error: billError } = await supabaseClient.from("tenant_bills").insert(tenantBillPayload()).select("*").single();
  if (handleCloudError(billError, "儲存帳單")) return;

  const itemPayloads = rows.map((row) => tenantBillItemPayload(row, bill.id));
  const { error: itemError } = await supabaseClient.from("tenant_bill_items").insert(itemPayloads);
  if (handleCloudError(itemError, "儲存帳單明細")) return;

  setCloudMessage(`已儲存 ${bill.bill_year}年${bill.bill_month}月帳單，共 ${itemPayloads.length} 筆明細。`);
  await loadSavedTenantBills({ quiet: true });
}

function savedBillFromCloud(bill) {
  const items = bill.tenant_bill_items || [];
  const firstItem = items[0];
  const snapshot = firstItem?.meter_snapshot || {};
  const electricTotal = Number(snapshot.officialElectricTotal || 0) || items.reduce((sum, item) => sum + Number(item.electric_fee || 0), 0);
  const waterTotal = Number(snapshot.officialWaterTotal || 0) || items.reduce((sum, item) => sum + Number(item.water_fee || 0), 0);
  return {
    ...bill,
    officialElectricTotal: electricTotal,
    officialWaterTotal: waterTotal,
    tenant_bill_items: [...items].sort((a, b) => String(a.unit_label || "").localeCompare(String(b.unit_label || ""), "zh-Hant"))
  };
}

async function loadSavedTenantBills({ quiet = false } = {}) {
  if (!canSyncCloud()) return;
  const { data: bills, error } = await supabaseClient
    .from("tenant_bills")
    .select("*, tenant_bill_items(*)")
    .eq("organization_id", currentOrganization.id)
    .order("bill_year", { ascending: false })
    .order("bill_month", { ascending: false })
    .order("created_at", { ascending: false });
  if (handleCloudError(error, "載入已存帳單")) return;
  const { data: utilityPeriods, error: utilityError } = await supabaseClient
    .from("utility_periods")
    .select("*, utility_readings(*)")
    .eq("organization_id", currentOrganization.id)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });
  if (handleCloudError(utilityError, "載入歷史水電")) return;

  const savedUtilityIds = new Set((bills || []).map((bill) => bill.utility_period_id).filter(Boolean));
  const historyBills = (utilityPeriods || [])
    .filter((period) => !savedUtilityIds.has(period.id))
    .map(utilityHistoryBillFromCloud);
  savedTenantBills = [...(bills || []).map(savedBillFromCloud), ...historyBills].sort((a, b) => {
    const periodCompare = Number(b.bill_year || 0) - Number(a.bill_year || 0) || Number(b.bill_month || 0) - Number(a.bill_month || 0);
    if (periodCompare) return periodCompare;
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });
  renderSavedBillOptions();
  if (!quiet) setCloudMessage(`已載入 ${savedTenantBills.length} 張已存帳單。`);
}

function loadSelectedTenantBill() {
  const bill = savedTenantBills[Number(els.savedBillSelect.value)];
  if (!bill) {
    setCloudMessage("目前沒有可載入的帳單。");
    return;
  }
  els.billType.value = bill.bill_type || "simple";
  els.billYear.value = String(bill.bill_year || currentYear);
  els.billMonth.value = String(bill.bill_month || 1);
  els.billDueDate.value = bill.due_date || "";
  els.billNote.value = bill.note || "";
  els.billElectricTotal.value = Number(bill.officialElectricTotal || 0);
  els.billWaterTotal.value = Number(bill.officialWaterTotal || 0);
  billAddressOverride = bill.address || "";
  billPeriodOverride = `${bill.bill_year}年${bill.bill_month}月`;
  billTenants = (bill.tenant_bill_items || []).map((item) => ({
    unit: item.unit_label || "",
    tenant: item.tenant_name || "",
    rent: Number(item.rent_amount || 0),
    other: Number(item.other_amount || 0),
    electricPrevious: Number(item.meter_snapshot?.electricPrevious || 0),
    electricCurrent: Number(item.meter_snapshot?.electricCurrent || 0),
    waterPrevious: Number(item.meter_snapshot?.waterPrevious || 0),
    waterCurrent: Number(item.meter_snapshot?.waterCurrent || 0)
  }));
  renderBillTenantRows();
  renderTenantBill();
  setCloudMessage(`已載入 ${savedBillLabel(bill)}。`);
}

async function deleteSelectedTenantBill() {
  if (!canSyncCloud()) {
    setCloudMessage("請先登入 Supabase。");
    return;
  }
  const index = Number(els.savedBillSelect.value);
  const bill = savedTenantBills[index];
  if (!bill) {
    setCloudMessage("目前沒有可刪除的帳單。");
    return;
  }
  if (!window.confirm(`確定要刪除「${savedBillLabel(bill)}」嗎？帳單明細也會一併刪除。`)) return;

  const targetTable = bill.source === "utility_history" ? "utility_periods" : "tenant_bills";
  const targetId = bill.source === "utility_history" ? bill.utility_period_id : bill.id;
  const { error } = await supabaseClient.from(targetTable).delete().eq("id", targetId);
  if (handleCloudError(error, "刪除帳單")) return;
  savedTenantBills.splice(index, 1);
  renderSavedBillOptions();
  setCloudMessage("已刪除帳單與明細。");
}

function renderBillTenantSource() {
  const current = els.billTenantSource.value;
  els.billTenantSource.innerHTML = getRows()
    .map((row, index) => `<option value="${index}">${escapeHtml(row.address)}${row.tenant ? ` · ${escapeHtml(row.tenant)}` : ""}</option>`)
    .join("");
  if (current && [...els.billTenantSource.options].some((option) => option.value === current)) {
    els.billTenantSource.value = current;
  }
}

function renderRemittanceOptions() {
  const current = currentRemittanceProfile();
  if (!remittanceProfiles.length) {
    const placeholder = `<option value="">尚無匯款資料</option>`;
    els.billBank.innerHTML = placeholder;
    els.billAccount.innerHTML = placeholder;
    els.billPayee.innerHTML = placeholder;
    return;
  }
  els.billBank.innerHTML = remittanceProfiles.map((profile, index) => `<option value="${index}">${escapeHtml(profile.bank || "未填銀行")}</option>`).join("");
  els.billAccount.innerHTML = remittanceProfiles.map((profile, index) => `<option value="${index}">${escapeHtml(profile.account || "未填帳號")}</option>`).join("");
  els.billPayee.innerHTML = remittanceProfiles.map((profile, index) => `<option value="${index}">${escapeHtml(profile.payee || "未填收款人")}</option>`).join("");
  const index = remittanceProfiles.findIndex((profile) => profile === current);
  syncRemittanceProfile(index >= 0 ? index : 0);
}

function currentRemittanceProfile() {
  const index = Number(els.billBank.value || 0);
  return remittanceProfiles[index] || remittanceProfiles[0] || { bank: "", account: "", payee: "" };
}

function renderDashboard() {
  const rows = getRows();
  const statuses = rows.map((row, index) => ({ row, index, status: paymentStatus(row, currentMonth) }));
  const paid = statuses.filter(({ status }) => status.key === "paid").length;
  const open = statuses.filter(({ status }) => status.key !== "paid").length;

  els.expectedRent.textContent = money(expectedThisMonth(rows, currentMonth));
  els.paidCount.textContent = `${paid} / ${rows.length}`;
  els.openCount.textContent = String(open);
  els.yearCollected.textContent = money(collectedThisYear(rows));
  els.statusSubtitle.textContent = `${currentYear} ${currentMonth}，依收款紀錄與繳費週期推估`;

  const visible = activeStatus === "all" ? statuses : statuses.filter(({ status }) => status.key === activeStatus || (activeStatus === "attention" && status.key === "special"));
  els.statusList.innerHTML = visible
    .map(({ row, status, index }) => {
      const displayName = row.tenant ? `${row.tenant} · ${row.address}` : row.address;
      return `
        <article class="status-row">
          <div class="status-title">
            <strong>${escapeHtml(displayName)}</strong>
            <span>${escapeHtml(row.cycle || "未設定週期")} · 匯款帳戶 ${escapeHtml(accountParts(row.bankAccount).join("、") || "未填")}</span>
          </div>
          <strong>${money(row.rent)}</strong>
          <span class="meta-text">${escapeHtml(row.payments[currentMonth] || "尚未填寫")}</span>
          <button class="pill ${status.key}" type="button" data-payment-edit="${index}" data-month="${currentMonth}">${escapeHtml(status.label)}</button>
        </article>
      `;
    })
    .join("");

  els.monthBars.innerHTML = MONTHS.map((month) => {
    const total = rows.length || 1;
    const count = rows.filter((row) => isPaid(row.payments[month])).length;
    const pct = Math.round((count / total) * 100);
    return `
      <div class="bar-row">
        <span>${month}</span>
        <div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${pct}%"></div></div>
        <strong>${pct}%</strong>
      </div>
    `;
  }).join("");
}

function renderPayments() {
  const query = els.paymentSearch.value.trim().toLowerCase();
  const rows = getRows().filter((row) => [row.address, row.tenant, row.bankAccount].join(" ").toLowerCase().includes(query));
  els.paymentPrintMeta.textContent = `${currentYear} 年度｜共 ${rows.length} 筆物件｜列印時間 ${new Date().toLocaleDateString("zh-TW")}`;
  els.paymentTable.querySelector("thead").innerHTML = `
    <tr>
      <th>地址</th>
      <th>租客</th>
      <th>租金</th>
      <th>週期</th>
      <th>匯款帳戶後五碼</th>
      ${MONTHS.map((month) => `<th>${month}</th>`).join("")}
    </tr>
  `;
  els.paymentTable.querySelector("tbody").innerHTML = rows
    .map((row) => {
      const originalIndex = getRows().indexOf(row);
      return `
        <tr>
          <td class="address-col"><strong>${escapeHtml(row.address)}</strong></td>
          <td class="tenant-col">${escapeHtml(row.tenant || "未填")}</td>
          <td class="rent-col">${money(row.rent)}</td>
          <td class="cycle-col">${escapeHtml(row.cycle || "未設定")}</td>
          <td class="account-col"><div class="account-list">${accountBadges(row.bankAccount)}</div></td>
          ${MONTHS.map((month) => {
            const value = row.payments[month] || "";
            const status = paymentStatus(row, month).key;
            return `<td class="month-col"><button class="payment-cell ${value ? "" : "empty"}" type="button" data-row="${originalIndex}" data-month="${month}" data-payment-cell>${escapeHtml(value || "填寫")}</button><div class="pill ${status}">${escapeHtml(paymentStatus(row, month).label)}</div></td>`;
          }).join("")}
        </tr>
      `;
    })
    .join("");
}

function printCurrentView(view) {
  document.body.dataset.printView = view;
  window.print();
}

function renderProperties() {
  els.propertyCards.innerHTML = getRows()
    .map((row, index) => `
      <article class="property-card">
        <header>
          <h4>${escapeHtml(row.address)}</h4>
          <div class="property-actions">
            <button class="quiet-button" type="button" data-property-edit="${index}">編輯</button>
            <button class="danger-button" type="button" data-property-delete="${index}">刪除</button>
          </div>
        </header>
        <div class="property-meta">
          <span>租客<strong>${escapeHtml(row.tenant || "未填")}</strong></span>
          <span>月租<strong>${money(row.rent)}</strong></span>
          <span>週期<strong>${escapeHtml(row.cycle || "未設定")}</strong></span>
          <span>帳號<strong>${escapeHtml(row.bankAccount || "未填")}</strong></span>
          <span>電錶<strong>${escapeHtml(meterText(row.electricPrevious, row.electricCurrent))}</strong></span>
          <span>水錶<strong>${escapeHtml(meterText(row.waterPrevious, row.waterCurrent))}</strong></span>
        </div>
        <p class="meta-text">${escapeHtml(row.notes || "沒有備註")}</p>
      </article>
    `)
    .join("");
}

function meterText(previous, current) {
  const hasPrevious = previous !== undefined && previous !== null && previous !== "";
  const hasCurrent = current !== undefined && current !== null && current !== "";
  if (!hasPrevious && !hasCurrent) return "未填";
  return `${hasPrevious ? previous : "-"} → ${hasCurrent ? current : "-"}`;
}

function renderTenantSplitRows() {
  els.tenantSplitTable.querySelector("tbody").innerHTML = utilityTenants
    .map((tenant, index) => `
      <tr>
        <td><input data-split-field="name" data-split-index="${index}" value="${escapeAttr(tenant.name)}" placeholder="租客姓名"></td>
        <td><input data-split-field="start" data-split-index="${index}" type="date" value="${escapeAttr(tenant.start)}"></td>
        <td><input data-split-field="end" data-split-index="${index}" type="date" value="${escapeAttr(tenant.end)}"></td>
        <td>
          <select data-split-field="charge" data-split-index="${index}">
            <option value="tenant" ${tenant.charge !== "owner" ? "selected" : ""}>向租客收費</option>
            <option value="owner" ${tenant.charge === "owner" ? "selected" : ""}>空屋/屋主吸收</option>
          </select>
        </td>
        <td><input data-split-field="electricPrevious" data-split-index="${index}" type="number" min="0" step="0.01" value="${Number(tenant.electricPrevious || 0)}"></td>
        <td><input data-split-field="electricCurrent" data-split-index="${index}" type="number" min="0" step="0.01" value="${Number(tenant.electricCurrent || 0)}"></td>
        <td><input data-split-field="waterPrevious" data-split-index="${index}" type="number" min="0" step="0.01" value="${Number(tenant.waterPrevious || 0)}"></td>
        <td><input data-split-field="waterCurrent" data-split-index="${index}" type="number" min="0" step="0.01" value="${Number(tenant.waterCurrent || 0)}"></td>
        <td><button class="danger-button" type="button" data-split-delete="${index}">刪除</button></td>
      </tr>
    `)
    .join("");
}

function renderBillTenantRows() {
  els.billTenantTable.querySelector("tbody").innerHTML = billTenants
    .map((tenant, index) => `
      <tr>
        <td><input data-bill-field="unit" data-bill-index="${index}" value="${escapeAttr(tenant.unit)}" placeholder="例：11樓之一"></td>
        <td><input data-bill-field="tenant" data-bill-index="${index}" value="${escapeAttr(tenant.tenant)}" placeholder="租客姓名"></td>
        <td><input data-bill-field="rent" data-bill-index="${index}" type="number" min="0" value="${Number(tenant.rent || 0)}"></td>
        <td><input data-bill-field="other" data-bill-index="${index}" type="number" min="0" value="${Number(tenant.other || 0)}"></td>
        <td><input data-bill-field="electricPrevious" data-bill-index="${index}" type="number" min="0" step="0.01" value="${Number(tenant.electricPrevious || 0)}"></td>
        <td><input data-bill-field="electricCurrent" data-bill-index="${index}" type="number" min="0" step="0.01" value="${Number(tenant.electricCurrent || 0)}"></td>
        <td><input data-bill-field="waterPrevious" data-bill-index="${index}" type="number" min="0" step="0.01" value="${Number(tenant.waterPrevious || 0)}"></td>
        <td><input data-bill-field="waterCurrent" data-bill-index="${index}" type="number" min="0" step="0.01" value="${Number(tenant.waterCurrent || 0)}"></td>
        <td><button class="danger-button" type="button" data-bill-delete="${index}">刪除</button></td>
      </tr>
    `)
    .join("");
}

function selectedBillProperty() {
  const index = Number(els.billAddress.value);
  return getRows()[index] || null;
}

function applyBillPropertyDefaults(overwriteTenants = true) {
  const property = selectedBillProperty();
  if (!property) return;
  if (overwriteTenants) {
    billTenants = [{
      unit: property.address,
      tenant: property.tenant || "",
      rent: Number(property.rent || 0),
      other: 0,
      electricPrevious: Number(property.electricPrevious || 0),
      electricCurrent: Number(property.electricCurrent || 0),
      waterPrevious: Number(property.waterPrevious || 0),
      waterCurrent: Number(property.waterCurrent || 0)
    }];
    renderBillTenantRows();
  }
}

function updateBillDueDate() {
  const property = selectedBillProperty();
  if (!property) return;
  const day = dueDay(property.cycle);
  if (!day) {
    els.billDueDate.value = "";
    return;
  }
  const year = Number(els.billYear.value || currentYear);
  const month = Number(els.billMonth.value || 1);
  const dueDate = new Date(year, month - 1, day + 14);
  els.billDueDate.value = formatDateInput(dueDate);
}

function syncRemittanceProfile(index) {
  if (!remittanceProfiles.length) {
    els.billBank.value = "";
    els.billAccount.value = "";
    els.billPayee.value = "";
    return;
  }
  const normalized = Math.max(0, Math.min(Number(index || 0), remittanceProfiles.length - 1));
  els.billBank.value = String(normalized);
  els.billAccount.value = String(normalized);
  els.billPayee.value = String(normalized);
}

function calculateBillRows() {
  const isShared = els.billType.value === "shared";
  const electricTotal = numberValue(els.billElectricTotal);
  const waterTotal = numberValue(els.billWaterTotal);
  const enriched = billTenants.map((tenant) => ({
    ...tenant,
    electricUsage: Math.max(Number(tenant.electricCurrent || 0) - Number(tenant.electricPrevious || 0), 0),
    waterUsage: Math.max(Number(tenant.waterCurrent || 0) - Number(tenant.waterPrevious || 0), 0)
  }));
  const electricUsageTotal = enriched.reduce((sum, row) => sum + row.electricUsage, 0) || 1;
  const waterUsageTotal = enriched.reduce((sum, row) => sum + row.waterUsage, 0) || 1;

  return enriched.map((row) => {
    const electricRatio = row.electricUsage / electricUsageTotal;
    const waterRatio = row.waterUsage / waterUsageTotal;
    const electricFee = isShared ? Math.round(electricTotal * electricRatio) : 0;
    const waterFee = isShared ? Math.round(waterTotal * waterRatio) : 0;
    const total = Number(row.rent || 0) + Number(row.other || 0) + electricFee + waterFee;
    return { ...row, electricFee, waterFee, electricRatio, waterRatio, total };
  });
}

function renderTenantBill() {
  const rows = calculateBillRows();
  const isShared = els.billType.value === "shared";
  const profile = currentRemittanceProfile();
  const bankParts = [profile.bank, profile.payee, profile.account].filter(Boolean).join(" · ");
  document.querySelectorAll(".shared-bill-field, .shared-bill-section").forEach((element) => {
    element.classList.toggle("is-hidden", !isShared);
  });
  els.billSummaryBand.classList.toggle("is-hidden", isShared);
  els.billReportTitle.textContent = "租客帳單報表";
  els.billReportAddress.textContent = billAddressOverride || selectedBillProperty()?.address || "未填地址";
  els.billReportPeriod.textContent = billPeriodText();
  els.billElectricLabel.textContent = isShared ? "官方電費總額" : "水電費";
  els.billWaterLabel.textContent = isShared ? "官方水費總額" : "收費方式";
  els.billReportElectric.textContent = isShared ? money(numberValue(els.billElectricTotal)) : "內含/自繳";
  els.billReportWater.textContent = isShared ? money(numberValue(els.billWaterTotal)) : "不另計";
  els.billExplainTitle.textContent = isShared ? "分攤方式" : "帳單說明";
  els.billExplainText.textContent = isShared
    ? "電費與水費依各分租單位的分錶用量比例分攤：官方帳單總額 × 該單位用量 ÷ 全部單位用量。"
    : "租金內含水電，或水電由租客自行向官方繳納者，本報表僅列租金與其他費用。";
  els.billReportNote.textContent = els.billNote.value || "";
  els.billReportBank.textContent = bankParts || "未填";
  els.billExcelReport.classList.toggle("is-hidden", !isShared);
  els.billExcelReport.innerHTML = isShared ? renderExcelStyleBill(rows) : "";
  els.billShareTableSection.classList.add("is-hidden");
  els.billShareTableBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.unit || "未填")}</td>
      <td>${escapeHtml(row.tenant || "未填")}</td>
      <td>${formatMeter(row.electricCurrent)}</td>
      <td>${formatMeter(row.electricPrevious)}</td>
      <td>${formatMeter(row.electricUsage)}</td>
      <td>${money(row.electricFee)}</td>
      <td>${formatMeter(row.waterCurrent)}</td>
      <td>${formatMeter(row.waterPrevious)}</td>
      <td>${formatMeter(row.waterUsage)}</td>
      <td>${money(row.waterFee)}</td>
      <td>${money(row.rent)}</td>
      <td>${money(row.total)}</td>
    </tr>
  `).join("");
  els.billTenantCards.classList.toggle("is-hidden", isShared);
  els.billTenantCards.innerHTML = rows
    .map((row) => `
      <article class="bill-card">
        <header>
          <div>
            <span>${escapeHtml(row.unit || "未填單位")}</span>
            <h3>${escapeHtml(row.tenant || "未填租客")}</h3>
          </div>
          <strong>${money(row.total)}</strong>
        </header>
        <div class="bill-lines">
          ${billLine("租金", money(row.rent))}
          ${isShared ? billLine("電費", `${money(row.electricFee)}（${row.electricUsage.toLocaleString("zh-TW")} 度，占 ${(row.electricRatio * 100).toFixed(1)}%）`) : ""}
          ${isShared ? billLine("水費", `${money(row.waterFee)}（${row.waterUsage.toLocaleString("zh-TW")} 度，占 ${(row.waterRatio * 100).toFixed(1)}%）`) : ""}
          ${billLine("其他", money(row.other))}
        </div>
        <p class="payment-reminder">請於 ${escapeHtml(els.billDueDate.value || "指定期限")} 前匯款繳交租金。</p>
      </article>
    `)
    .join("");
}

function billLine(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderExcelStyleBill(rows) {
  const colors = ["#b8cbe1", "#d7e5be", "#f1d6b8", "#d9c7e8"];
  const header = `
    <div class="excel-utility-header">
      <div class="excel-total-pair"><span>此戶總電費</span><strong>${money(numberValue(els.billElectricTotal))}</strong></div>
      <div class="excel-total-pair"><span>此戶總水費</span><strong>${money(numberValue(els.billWaterTotal))}</strong></div>
      <div></div>
    </div>
  `;
  return header + rows.map((row, index) => `
    <article class="excel-tenant-block">
      <header style="background:${colors[index % colors.length]}">
        <strong>${escapeHtml(row.unit || "未填單位")}</strong>
        <span>${escapeHtml(row.tenant || "未填租客")}</span>
      </header>
      <div class="excel-calc-grid">
        <section class="excel-calc-box">
          ${excelRow("本次電度數", formatMeter(row.electricCurrent))}
          ${excelRow("上次電度數", formatMeter(row.electricPrevious))}
          ${excelRow("用電度數", formatMeter(row.electricUsage))}
          <div class="excel-result-row"><span>分攤後電費</span><strong>${money(row.electricFee)}</strong></div>
        </section>
        <section class="excel-calc-box">
          ${excelRow("本次水度數", formatMeter(row.waterCurrent))}
          ${excelRow("上次水度數", formatMeter(row.waterPrevious))}
          ${excelRow("用水度數", formatMeter(row.waterUsage))}
          <div class="excel-result-row"><span>分攤後水費</span><strong>${money(row.waterFee)}</strong></div>
        </section>
        <section class="excel-calc-box total-box">
          ${excelRow("租金", money(row.rent))}
          ${excelRow("電費", money(row.electricFee))}
          ${excelRow("水費", money(row.waterFee))}
          ${excelRow("其他", money(row.other))}
          <div class="excel-total-row"><span>應繳房租</span><strong>${money(row.total)}</strong></div>
        </section>
      </div>
    </article>
  `).join("");
}

function excelRow(label, value) {
  return `<div class="excel-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function formatMeter(value) {
  return Number(value || 0).toLocaleString("zh-TW", { maximumFractionDigits: 2 });
}

function renderSettlement() {
  const monthlyRent = numberValue(els.settlementRent);
  const deposit = numberValue(els.settlementDeposit);
  const prepaidRent = numberValue(els.prepaidRent);
  const unpaidRent = numberValue(els.unpaidRent);
  const damageFee = numberValue(els.damageFee);
  const otherFee = numberValue(els.otherFee);
  const monthDays = daysInMonth(els.settlementMonth.value);
  const start = monthStart(els.settlementMonth.value);
  const moveOut = dateValue(els.moveOutDate.value);
  const usedDays = start && moveOut ? Math.min(inclusiveDays(start, moveOut), monthDays) : 0;
  const dailyRent = monthDays ? monthlyRent / monthDays : 0;
  const rentUntilMoveOut = Math.round(dailyRent * usedDays);
  const prepaidRefund = Math.max(prepaidRent - rentUntilMoveOut, 0);

  const utility = calculateUtilities();
  const utilityForMoveOutTenant = utility.billReceived ? utility.rows[0]?.tenantCharge || 0 : 0;
  const deductions = unpaidRent + damageFee + otherFee + utilityForMoveOutTenant;
  const finalRefund = deposit + prepaidRefund - deductions;

  els.settlementSummary.innerHTML = [
    summaryCard("月租日割", `${money(Math.round(dailyRent))} / 日`, `${usedDays} / ${monthDays} 天`),
    summaryCard("退租日前租金", money(rentUntilMoveOut), "以退租日含當日計算"),
    summaryCard("預繳租金應退", money(prepaidRefund), "已收租金扣除實住天數"),
    summaryCard("水電分攤", utility.billReceived ? money(utilityForMoveOutTenant) : "待結算", utility.billReceived ? "取第一列退租租客金額" : "官方兩月帳單未到，暫不進押金結算"),
    summaryCard("押金", money(deposit), "可抵扣未繳與費用"),
    summaryCard("扣款合計", money(deductions), "未繳租金、修繕、其他、水電"),
    summaryCard(finalRefund >= 0 ? "應退租客" : "租客需補繳", money(Math.abs(finalRefund)), finalRefund >= 0 ? "押金與退租金扣除費用後" : "費用超過押金與退租金", `final ${finalRefund < 0 ? "negative" : ""}`)
  ].join("");

  els.tenantSplitResult.innerHTML = utility.rows.length
    ? utility.rows.map((row) => `
      <article class="split-row">
        <strong>${escapeHtml(row.name || "未命名")}</strong>
        <span>電 ${row.electricUsage.toLocaleString("zh-TW")} 度</span>
        <span>水 ${row.waterUsage.toLocaleString("zh-TW")} 度</span>
        <span>${row.charge === "owner" ? "屋主吸收" : `居住 ${row.activeDays} 天`}</span>
        <span>${utility.billReceived ? `電費 ${money(row.electric)}` : "電費待結"}</span>
        <span>${utility.billReceived ? `水費 ${money(row.water)}` : "水費待結"}</span>
        <strong>${utility.billReceived ? money(row.tenantCharge) : "待帳單"}</strong>
      </article>
    `).join("")
    : `<p class="meta-text">尚未輸入分攤租客。</p>`;
}

function summaryCard(label, value, hint, className = "") {
  return `
    <article class="summary-card ${className}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small class="meta-text">${escapeHtml(hint)}</small>
    </article>
  `;
}

function calculateUtilities() {
  const billStart = dateValue(els.utilityStart.value);
  const billEnd = dateValue(els.utilityEnd.value);
  const billDays = inclusiveDays(billStart, billEnd) || 1;
  const electricTotal = numberValue(els.electricBillTotal);
  const waterTotal = numberValue(els.waterBillTotal);
  const sharedOther = numberValue(els.sharedOtherFee);
  const billReceived = els.utilityBillStatus.value === "received";
  const mode = els.splitMode.value;
  const activeRows = utilityTenants.map((tenant) => {
    const moveIn = laterDate(dateValue(tenant.start), billStart);
    const moveOut = earlierDate(dateValue(tenant.end), billEnd);
    const activeDays = Math.min(inclusiveDays(moveIn, moveOut), billDays);
    return {
      ...tenant,
      activeDays: Math.max(activeDays, 0),
      electricUsage: Math.max(Number(tenant.electricCurrent || 0) - Number(tenant.electricPrevious || 0), 0),
      waterUsage: Math.max(Number(tenant.waterCurrent || 0) - Number(tenant.waterPrevious || 0), 0)
    };
  });

  const dayWeightTotal = activeRows.reduce((sum, row) => sum + row.activeDays, 0) || 1;
  const electricUsageTotal = activeRows.reduce((sum, row) => sum + row.electricUsage, 0) || 1;
  const waterUsageTotal = activeRows.reduce((sum, row) => sum + row.waterUsage, 0) || 1;

  return {
    billReceived,
    rows: activeRows.map((row) => {
      const dayRatio = row.activeDays / dayWeightTotal;
      const electric = electricTotal * (row.electricUsage / electricUsageTotal);
      const water = waterTotal * (row.waterUsage / waterUsageTotal);
      const shared = sharedOther * (mode === "usage" ? ((row.electricUsage + row.waterUsage) / (electricUsageTotal + waterUsageTotal)) : dayRatio);
      const total = Math.round(electric + water + shared);
      return {
        name: row.name,
        charge: row.charge,
        activeDays: row.activeDays,
        electricUsage: row.electricUsage,
        waterUsage: row.waterUsage,
        electric: billReceived ? Math.round(electric) : 0,
        water: billReceived ? Math.round(water) : 0,
        shared: Math.round(shared),
        total: billReceived ? total : 0,
        tenantCharge: billReceived && row.charge !== "owner" ? total : 0
      };
    })
  };
}

function render() {
  renderSelectors();
  renderBillControls();
  renderAuthState();
  renderDashboard();
  renderPayments();
  renderProperties();
  renderTenantSplitRows();
  renderSettlement();
  renderBillTenantRows();
  renderTenantBill();
}

function renderAuthState() {
  if (!supabaseClient) {
    els.authState.textContent = "未載入 Supabase";
    els.authMessage.textContent = "請確認 supabase-config.js 與網路連線。";
    els.loginMessage.textContent = "請確認 Supabase 設定與網路連線。";
    document.querySelector("#loginBtn").disabled = true;
    document.querySelector("#loginScreenBtn").disabled = true;
    document.querySelector("#logoutBtn").classList.add("is-hidden");
    return;
  }

  const userEmail = supabaseSession?.user?.email || "";
  const isLoggedIn = Boolean(userEmail);
  els.loginScreen.classList.toggle("is-hidden", isLoggedIn);
  els.authState.textContent = userEmail ? `已登入：${userEmail}` : "尚未登入";
  els.authMessage.textContent = userEmail ? "已登入，系統會自動載入並同步雲端資料。" : "登入後才能讀寫 Supabase 資料。";
  els.loginMessage.textContent = userEmail ? "" : "請登入後使用系統。";
  els.authEmail.classList.toggle("is-hidden", isLoggedIn);
  els.authPassword.classList.toggle("is-hidden", isLoggedIn);
  document.querySelector("#loginBtn").classList.toggle("is-hidden", isLoggedIn);
  document.querySelector("#logoutBtn").classList.toggle("is-hidden", !isLoggedIn);
  els.newPassword.classList.toggle("is-hidden", !isLoggedIn);
  els.confirmPassword.classList.toggle("is-hidden", !isLoggedIn);
  document.querySelector("#changePasswordBtn").classList.toggle("is-hidden", !isLoggedIn);
  renderOrganizationState();
}

async function loadSupabaseSession() {
  if (!supabaseClient) {
    renderAuthState();
    return;
  }
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    els.authMessage.textContent = error.message;
    return;
  }
  supabaseSession = data.session;
  renderAuthState();
  if (supabaseSession) {
    await initializeOrganization();
    await loadCloudData();
  }
}

async function loginSupabase() {
  if (!supabaseClient) return;
  const email = (els.loginEmail.value || els.authEmail.value).trim();
  const password = els.loginPassword.value || els.authPassword.value;
  if (!email || !password) {
    els.authMessage.textContent = "請輸入 Email 與密碼。";
    els.loginMessage.textContent = "請輸入 Email 與密碼。";
    return;
  }
  els.authMessage.textContent = "登入中...";
  els.loginMessage.textContent = "登入中...";
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    els.authMessage.textContent = error.message;
    els.loginMessage.textContent = error.message;
    return;
  }
  supabaseSession = data.session;
  els.loginPassword.value = "";
  els.authPassword.value = "";
  els.newPassword.value = "";
  els.confirmPassword.value = "";
  renderAuthState();
  await initializeOrganization();
  await loadCloudData();
}

async function logoutSupabase() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  supabaseSession = null;
  currentOrganization = null;
  currentOrgRole = "";
  els.loginPassword.value = "";
  els.authPassword.value = "";
  els.newPassword.value = "";
  els.confirmPassword.value = "";
  renderAuthState();
  renderOrganizationState();
}

async function changePassword() {
  if (!supabaseClient || !supabaseSession) return;
  const password = els.newPassword.value;
  const confirmation = els.confirmPassword.value;
  if (password.length < 8) {
    els.authMessage.textContent = "新密碼至少需要 8 個字元。";
    els.newPassword.focus();
    return;
  }
  if (password !== confirmation) {
    els.authMessage.textContent = "兩次輸入的新密碼不一致。";
    els.confirmPassword.focus();
    return;
  }

  els.authMessage.textContent = "正在變更密碼...";
  const { error } = await supabaseClient.auth.updateUser({ password });
  if (error) {
    els.authMessage.textContent = error.message;
    return;
  }

  els.newPassword.value = "";
  els.confirmPassword.value = "";
  els.authMessage.textContent = "密碼已更新。下次登入請使用新密碼。";
}

function renderOrganizationState() {
  if (!supabaseSession) {
    els.organizationState.textContent = "尚未登入";
    els.teamMessage.textContent = "登入後可邀請協作者。";
    document.querySelector("#inviteMemberBtn").disabled = true;
    els.inviteEmail.disabled = true;
    els.inviteRole.disabled = true;
    return;
  }
  if (!currentOrganization) {
    els.organizationState.textContent = "尚未載入團隊";
    els.teamMessage.textContent = "正在載入團隊資料...";
    return;
  }
  const roleText = { owner: "擁有者", editor: "可編輯", viewer: "只能查看" }[currentOrgRole] || "成員";
  els.organizationState.textContent = `${currentOrganization.name || "房租管理"} · ${roleText}`;
  const manageable = canManageCurrentOrg();
  document.querySelector("#inviteMemberBtn").disabled = !manageable;
  els.inviteEmail.disabled = !manageable;
  els.inviteRole.disabled = !manageable;
  els.teamMessage.textContent = manageable ? "輸入 Email 可邀請協作者。" : "只有擁有者可以邀請協作者。";
}

async function initializeOrganization() {
  if (!supabaseClient || !supabaseSession) return;
  const { error: acceptError } = await supabaseClient.rpc("accept_pending_invitations");
  if (acceptError) {
    setTeamMessage(`接受邀請失敗：${acceptError.message}`);
  }

  const { data: orgId, error: ensureError } = await supabaseClient.rpc("ensure_default_organization");
  if (ensureError) {
    setTeamMessage(`載入團隊失敗：${ensureError.message}`);
    return;
  }

  const { data, error } = await supabaseClient
    .from("organization_members")
    .select("role, organizations(id,name)")
    .eq("organization_id", orgId)
    .eq("user_id", supabaseSession.user.id)
    .single();
  if (error) {
    setTeamMessage(`讀取團隊失敗：${error.message}`);
    return;
  }
  currentOrganization = data.organizations;
  currentOrgRole = data.role;
  renderOrganizationState();
}

async function inviteOrganizationMember() {
  if (!canManageCurrentOrg()) {
    setTeamMessage("只有擁有者可以邀請協作者。");
    return;
  }
  const email = els.inviteEmail.value.trim().toLowerCase();
  const role = els.inviteRole.value;
  if (!email) {
    setTeamMessage("請輸入協作者 Email。");
    return;
  }
  const { error } = await supabaseClient.from("organization_invitations").upsert({
    organization_id: currentOrganization.id,
    email,
    role,
    accepted_at: null
  }, { onConflict: "organization_id,email" });
  if (error) {
    setTeamMessage(`邀請失敗：${error.message}`);
    return;
  }
  els.inviteEmail.value = "";
  setTeamMessage(`已邀請 ${email}，對方建立帳號並登入後會自動加入。`);
}

function propertyPayload(row, year, index) {
  return {
    organization_id: currentOrganization?.id,
    rent_year: Number(year),
    sort_order: index,
    address: row.address || "",
    tenant_name: row.tenant || "",
    rent_amount: Number(row.rent || 0),
    payment_cycle: row.cycle || "",
    bank_account_last5: row.bankAccount || "",
    notes: row.notes || "",
    electric_previous: Number(row.electricPrevious || 0),
    electric_current: Number(row.electricCurrent || 0),
    water_previous: Number(row.waterPrevious || 0),
    water_current: Number(row.waterCurrent || 0),
    active: true
  };
}

function canSyncCloud() {
  return Boolean(supabaseClient && supabaseSession && currentOrganization?.id);
}

function canEditCurrentOrg() {
  return ["owner", "editor"].includes(currentOrgRole);
}

function canManageCurrentOrg() {
  return currentOrgRole === "owner";
}

function setCloudMessage(message) {
  if (els.authMessage) els.authMessage.textContent = message;
}

function setTeamMessage(message) {
  if (els.teamMessage) els.teamMessage.textContent = message;
}

function handleCloudError(error, action) {
  if (!error) return false;
  setCloudMessage(`${action}失敗：${error.message}`);
  return true;
}

function propertyFromCloud(row) {
  return {
    id: row.id,
    address: row.address || "",
    tenant: row.tenant_name || "",
    rent: Number(row.rent_amount || 0),
    cycle: row.payment_cycle || "",
    bankAccount: row.bank_account_last5 || "",
    notes: row.notes || "",
    electricPrevious: Number(row.electric_previous || 0),
    electricCurrent: Number(row.electric_current || 0),
    waterPrevious: Number(row.water_previous || 0),
    waterCurrent: Number(row.water_current || 0),
    payments: emptyPayments()
  };
}

async function syncPropertyToCloud(row, year, index) {
  if (!canSyncCloud()) return;
  const payload = propertyPayload(row, year, index);
  if (row.id) {
    const { error } = await supabaseClient.from("properties").update(payload).eq("id", row.id);
    if (handleCloudError(error, "同步物件")) return;
    setCloudMessage("物件資料已同步到雲端。");
    return;
  }

  const { data, error } = await supabaseClient.from("properties").insert(payload).select("id").single();
  if (handleCloudError(error, "新增物件")) return;
  row.id = data.id;
  persist();
  await upsertPropertyPaymentsToCloud(row, year);
  setCloudMessage("新增物件已同步到雲端。");
}

async function syncPaymentToCloud(row, year, month) {
  if (!canSyncCloud() || !row.id) return;
  const monthNumber = Number(String(month).replace("月", ""));
  const { error } = await supabaseClient.from("rent_payments").upsert({
    organization_id: currentOrganization.id,
    property_id: row.id,
    rent_year: Number(year),
    rent_month: monthNumber,
    payment_text: row.payments?.[month] || "",
    notes: row.notes || ""
  }, { onConflict: "organization_id,property_id,rent_year,rent_month" });
  if (handleCloudError(error, "同步收款")) return;
  setCloudMessage(`${year} ${month} 收款紀錄已同步到雲端。`);
}

async function upsertPropertyPaymentsToCloud(row, year) {
  if (!canSyncCloud() || !row.id) return;
  const paymentRows = MONTHS.map((month, monthIndex) => ({
    organization_id: currentOrganization.id,
    property_id: row.id,
    rent_year: Number(year),
    rent_month: monthIndex + 1,
    payment_text: row.payments?.[month] || "",
    notes: row.notes || ""
  }));
  const { error } = await supabaseClient.from("rent_payments").upsert(paymentRows, { onConflict: "organization_id,property_id,rent_year,rent_month" });
  handleCloudError(error, "同步月份收款");
}

async function deletePropertyFromCloud(row) {
  if (!canSyncCloud() || !row?.id) return;
  const { error } = await supabaseClient.from("properties").delete().eq("id", row.id);
  if (handleCloudError(error, "刪除雲端物件")) return;
  setCloudMessage("雲端物件已刪除。");
}

function remittancePayload(profile, index) {
  return {
    organization_id: currentOrganization?.id,
    bank_name: profile.bank || "",
    account_number: profile.account || "",
    payee_name: profile.payee || "",
    is_default: index === 0
  };
}

function remittanceFromCloud(row) {
  return {
    id: row.id,
    bank: row.bank_name || "",
    account: row.account_number || "",
    payee: row.payee_name || ""
  };
}

async function loadRemittanceProfilesFromCloud({ quiet = false } = {}) {
  if (!canSyncCloud()) return;
  const { data, error } = await supabaseClient
    .from("remittance_profiles")
    .select("*")
    .eq("organization_id", currentOrganization.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (handleCloudError(error, "載入匯款資料")) return;

  if (data.length) {
    remittanceProfiles = data.map(remittanceFromCloud);
    persistRemittanceProfiles();
    renderRemittanceOptions();
    renderTenantBill();
    if (!quiet) setCloudMessage(`已從雲端載入 ${data.length} 筆匯款資料。`);
    return;
  }

  await importRemittanceProfilesToCloud({ quiet: true });
  if (!quiet) setCloudMessage("雲端尚無匯款資料，已用本機資料建立。");
}

async function importRemittanceProfilesToCloud({ quiet = false } = {}) {
  if (!canSyncCloud()) return;
  const payload = remittanceProfiles.map(remittancePayload);
  if (!payload.length) return;
  const { data, error } = await supabaseClient.from("remittance_profiles").insert(payload).select("*");
  if (handleCloudError(error, "匯入匯款資料")) return;
  remittanceProfiles = data.map(remittanceFromCloud);
  persistRemittanceProfiles();
  renderRemittanceOptions();
  renderTenantBill();
  if (!quiet) setCloudMessage(`已匯入 ${data.length} 筆匯款資料到雲端。`);
}

async function saveRemittanceProfileToCloud(profile, index) {
  if (!canSyncCloud()) return;
  const payload = remittancePayload(profile, index);
  if (profile.id) {
    const { error } = await supabaseClient.from("remittance_profiles").update(payload).eq("id", profile.id);
    if (handleCloudError(error, "同步匯款資料")) return;
    setCloudMessage("匯款資料已同步到雲端。");
    return;
  }

  const { data, error } = await supabaseClient.from("remittance_profiles").insert(payload).select("*").single();
  if (handleCloudError(error, "新增匯款資料")) return;
  Object.assign(profile, remittanceFromCloud(data));
  persistRemittanceProfiles();
  setCloudMessage("新增匯款資料已同步到雲端。");
}

async function deleteRemittanceProfileFromCloud(profile) {
  if (!canSyncCloud() || !profile?.id) return;
  const { error } = await supabaseClient.from("remittance_profiles").delete().eq("id", profile.id);
  if (handleCloudError(error, "刪除匯款資料")) return;
  setCloudMessage("匯款資料已從雲端刪除。");
}

function deleteCurrentRemittanceProfile() {
  if (!remittanceProfiles.length) {
    setCloudMessage("目前沒有可刪除的匯款資料。");
    return;
  }
  const index = Math.max(0, Number(els.billBank.value || 0));
  const profile = remittanceProfiles[index] || remittanceProfiles[0];
  const name = [profile.bank, profile.payee, profile.account].filter(Boolean).join(" · ") || "這筆匯款資料";
  if (!window.confirm(`確定要刪除「${name}」嗎？`)) return;

  remittanceProfiles.splice(index, 1);
  persistRemittanceProfiles();
  renderRemittanceOptions();
  syncRemittanceProfile(Math.min(index, remittanceProfiles.length - 1));
  renderTenantBill();
  deleteRemittanceProfileFromCloud(profile);
}

async function importLocalDataToCloud() {
  if (!supabaseClient || !supabaseSession) return;
  if (!window.confirm("這會清除你帳號目前雲端的物件與收款紀錄，再匯入本機資料。確定繼續？")) return;

  els.authMessage.textContent = "正在匯入雲端...";
  const { error: deletePaymentsError } = await supabaseClient.from("rent_payments").delete().eq("organization_id", currentOrganization.id);
  if (deletePaymentsError) {
    els.authMessage.textContent = deletePaymentsError.message;
    return;
  }
  const { error: deletePropertiesError } = await supabaseClient.from("properties").delete().eq("organization_id", currentOrganization.id);
  if (deletePropertiesError) {
    els.authMessage.textContent = deletePropertiesError.message;
    return;
  }

  const propertyRows = [];
  Object.entries(state).forEach(([year, rows]) => {
    rows.forEach((row, index) => propertyRows.push(propertyPayload(row, year, index)));
  });

  const { data: insertedProperties, error: insertPropertiesError } = await supabaseClient
    .from("properties")
    .insert(propertyRows)
    .select("id,rent_year,sort_order");
  if (insertPropertiesError) {
    els.authMessage.textContent = insertPropertiesError.message;
    return;
  }

  const propertyIdMap = new Map(insertedProperties.map((row) => [`${row.rent_year}-${row.sort_order}`, row.id]));
  const paymentRows = [];
  Object.entries(state).forEach(([year, rows]) => {
    rows.forEach((row, index) => {
      MONTHS.forEach((month, monthIndex) => {
        const paymentText = row.payments?.[month] || "";
        const propertyId = propertyIdMap.get(`${year}-${index}`);
        if (!propertyId) return;
        paymentRows.push({
          organization_id: currentOrganization.id,
          property_id: propertyId,
          rent_year: Number(year),
          rent_month: monthIndex + 1,
          payment_text: paymentText,
          notes: row.notes || ""
        });
      });
    });
  });

  const { error: insertPaymentsError } = await supabaseClient.from("rent_payments").insert(paymentRows);
  if (insertPaymentsError) {
    els.authMessage.textContent = insertPaymentsError.message;
    return;
  }

  els.authMessage.textContent = `已匯入 ${propertyRows.length} 筆物件列與 ${paymentRows.length} 筆月份紀錄。`;
}

async function loadCloudData() {
  if (!supabaseClient || !supabaseSession) return;
  if (!currentOrganization?.id) {
    els.authMessage.textContent = "尚未載入團隊資料，請稍後再試。";
    return;
  }
  els.authMessage.textContent = "正在從雲端載入...";
  await loadRemittanceProfilesFromCloud({ quiet: true });
  await loadSavedTenantBills({ quiet: true });
  const { data: propertyRows, error: propertyError } = await supabaseClient
    .from("properties")
    .select("*")
    .eq("organization_id", currentOrganization.id)
    .order("rent_year", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (propertyError) {
    els.authMessage.textContent = propertyError.message;
    return;
  }
  if (!propertyRows.length) {
    els.authMessage.textContent = "雲端目前沒有資料，請先建立物件資料。";
    return;
  }

  const { data: paymentRows, error: paymentError } = await supabaseClient
    .from("rent_payments")
    .select("property_id,rent_year,rent_month,payment_text,notes")
    .eq("organization_id", currentOrganization.id);
  if (paymentError) {
    els.authMessage.textContent = paymentError.message;
    return;
  }

  const nextState = {};
  const propertyMap = new Map();
  propertyRows.forEach((cloudRow) => {
    const year = String(cloudRow.rent_year || currentYear);
    if (!nextState[year]) nextState[year] = [];
    const localRow = propertyFromCloud(cloudRow);
    nextState[year].push(localRow);
    propertyMap.set(cloudRow.id, localRow);
  });
  paymentRows.forEach((payment) => {
    const row = propertyMap.get(payment.property_id);
    if (!row) return;
    const month = `${payment.rent_month}月`;
    row.payments[month] = payment.payment_text || "";
    if (payment.notes && !row.notes) row.notes = payment.notes;
  });

  state = nextState;
  currentYear = Object.keys(state).sort().at(-1) || currentYear;
  persist();
  render();
  const yearSummary = Object.entries(state)
    .sort(([yearA], [yearB]) => yearA.localeCompare(yearB))
    .map(([year, rows]) => `${year} 年 ${rows.length} 筆`)
    .join("、");
  els.authMessage.textContent = `已從雲端載入 ${propertyRows.length} 筆物件列、${paymentRows.length} 筆月份收款紀錄（${yearSummary}）。`;
}

function switchView(view) {
  activeView = view;
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active-view", section.id === `${view}View`));
  els.pageTitle.textContent = { dashboard: "總覽", payments: "收款維護", properties: "物件資料", settlement: "退租結算", tenantBill: "租客帳單" }[view];
  els.topbarToolbar.classList.toggle("is-hidden", view === "tenantBill");
}

function openPaymentDialog(rowIndex, month) {
  const row = getRows()[rowIndex];
  els.dialogLabel.textContent = `${currentYear} ${month}`;
  els.dialogTitle.textContent = `${row.tenant || "未填租客"} · ${row.address}`;
  els.dialogFields.innerHTML = `
    <label>收款日期或狀態<input name="payment" value="${escapeAttr(row.payments[month] || "")}" placeholder="例：5/25、維修、退租"></label>
    <label>備註<textarea name="notes" placeholder="特殊折抵、維修或押金說明">${escapeHtml(row.notes || "")}</textarea></label>
  `;
  showDialog(() => {
    const form = new FormData(els.editForm);
    row.payments[month] = String(form.get("payment") || "").trim();
    row.notes = String(form.get("notes") || "").trim();
    persist();
    render();
    syncPaymentToCloud(row, currentYear, month);
    syncPropertyToCloud(row, currentYear, rowIndex);
  });
}

function openPropertyDialog(rowIndex) {
  const isNew = rowIndex === null;
  const row = isNew ? { address: "", tenant: "", rent: 0, cycle: "", bankAccount: "", notes: "", payments: emptyPayments(), electricPrevious: 0, electricCurrent: 0, waterPrevious: 0, waterCurrent: 0 } : getRows()[rowIndex];
  els.dialogLabel.textContent = isNew ? "新增物件" : "編輯物件";
  els.dialogTitle.textContent = row.address || "新出租物件";
  els.dialogFields.innerHTML = `
    <label>地址<input name="address" value="${escapeAttr(row.address)}" required></label>
    <label>租客<input name="tenant" value="${escapeAttr(row.tenant)}"></label>
    <label>月租<input name="rent" type="number" min="0" value="${Number(row.rent || 0)}"></label>
    <label>繳費週期<input name="cycle" value="${escapeAttr(row.cycle)}" placeholder="例：25日收、半年付"></label>
    <label>匯款帳戶後五碼<input name="bankAccount" value="${escapeAttr(row.bankAccount)}" placeholder="可輸入多組，例如：27825、42890"></label>
    <label>上次電度數<input name="electricPrevious" type="number" min="0" step="0.01" value="${Number(row.electricPrevious || 0)}"></label>
    <label>本次電度數<input name="electricCurrent" type="number" min="0" step="0.01" value="${Number(row.electricCurrent || 0)}"></label>
    <label>上次水度數<input name="waterPrevious" type="number" min="0" step="0.01" value="${Number(row.waterPrevious || 0)}"></label>
    <label>本次水度數<input name="waterCurrent" type="number" min="0" step="0.01" value="${Number(row.waterCurrent || 0)}"></label>
    <label>備註<textarea name="notes">${escapeHtml(row.notes || "")}</textarea></label>
  `;
  showDialog(() => {
    const form = new FormData(els.editForm);
    row.address = String(form.get("address") || "").trim();
    row.tenant = String(form.get("tenant") || "").trim();
    row.rent = Number(form.get("rent") || 0);
    row.cycle = String(form.get("cycle") || "").trim();
    row.bankAccount = String(form.get("bankAccount") || "").trim();
    row.electricPrevious = Number(form.get("electricPrevious") || 0);
    row.electricCurrent = Number(form.get("electricCurrent") || 0);
    row.waterPrevious = Number(form.get("waterPrevious") || 0);
    row.waterCurrent = Number(form.get("waterCurrent") || 0);
    row.notes = String(form.get("notes") || "").trim();
    if (isNew) getRows().push(row);
    persist();
    render();
    syncPropertyToCloud(row, currentYear, getRows().indexOf(row));
  });
}

function deleteProperty(rowIndex) {
  const row = getRows()[rowIndex];
  const name = row?.address || row?.tenant || "這個物件";
  if (!window.confirm(`確定要刪除「${name}」嗎？此操作會一併移除它的收款紀錄。`)) return;
  getRows().splice(rowIndex, 1);
  persist();
  render();
  deletePropertyFromCloud(row);
}

function showDialog(onSave) {
  els.dialog.showModal();
  els.editForm.onsubmit = (event) => {
    event.preventDefault();
    onSave();
    els.dialog.close();
  };
}

function exportCsv() {
  const headers = ["年度", "地址", "租金", "租客姓名", "繳費週期", "匯款帳戶後五碼", ...MONTHS, "備註"];
  const lines = [headers, ...getRows().map((row) => [currentYear, row.address, row.rent, row.tenant, row.cycle, row.bankAccount, ...MONTHS.map((month) => row.payments[month] || ""), row.notes])];
  const csv = lines.map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `房租收入_${currentYear}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

function applySidebarState(collapsed) {
  els.appShell.classList.toggle("sidebar-collapsed", collapsed);
  els.sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  els.sidebarToggle.setAttribute("aria-label", collapsed ? "展開側邊欄" : "收合側邊欄");
}

applySidebarState(localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");

els.sidebarToggle.addEventListener("click", () => {
  const collapsed = !els.appShell.classList.contains("sidebar-collapsed");
  localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  applySidebarState(collapsed);
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    activeStatus = button.dataset.status;
    document.querySelectorAll(".segment").forEach((segment) => segment.classList.toggle("active", segment === button));
    renderDashboard();
  });
});

els.yearSelect.addEventListener("change", () => {
  currentYear = els.yearSelect.value;
  render();
});

els.monthSelect.addEventListener("change", () => {
  currentMonth = els.monthSelect.value;
  render();
});

els.paymentSearch.addEventListener("input", renderPayments);
document.querySelector("#exportBtn").addEventListener("click", exportCsv);
document.querySelector("#loginBtn").addEventListener("click", loginSupabase);
document.querySelector("#loginScreenBtn").addEventListener("click", loginSupabase);
els.loginPassword.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loginSupabase();
});
els.loginEmail.addEventListener("keydown", (event) => {
  if (event.key === "Enter") els.loginPassword.focus();
});
document.querySelector("#logoutBtn").addEventListener("click", logoutSupabase);
document.querySelector("#changePasswordBtn").addEventListener("click", changePassword);
els.confirmPassword.addEventListener("keydown", (event) => {
  if (event.key === "Enter") changePassword();
});
document.querySelector("#inviteMemberBtn").addEventListener("click", inviteOrganizationMember);
document.querySelector("#addPropertyBtn").addEventListener("click", () => openPropertyDialog(null));
document.querySelector("#addUtilityTenantBtn").addEventListener("click", () => {
  utilityTenants.push({ name: "", start: "", end: "", charge: "tenant", electricPrevious: 0, electricCurrent: 0, waterPrevious: 0, waterCurrent: 0 });
  renderTenantSplitRows();
  renderSettlement();
});
document.querySelector("#addBillTenantBtn").addEventListener("click", () => {
  const source = getRows()[Number(els.billTenantSource.value)];
  billTenants.push({
    unit: source?.address || "",
    tenant: source?.tenant || "",
    rent: Number(source?.rent || 0),
    other: 0,
    electricPrevious: Number(source?.electricPrevious || 0),
    electricCurrent: Number(source?.electricCurrent || 0),
    waterPrevious: Number(source?.waterPrevious || 0),
    waterCurrent: Number(source?.waterCurrent || 0)
  });
  renderBillTenantRows();
  renderTenantBill();
});
document.querySelector("#printPaymentsBtn").addEventListener("click", () => printCurrentView("payments"));
document.querySelector("#printBillBtn").addEventListener("click", () => printCurrentView("tenantBill"));
document.querySelector("#saveTenantBillBtn").addEventListener("click", saveTenantBillToCloud);
document.querySelector("#deleteSavedBillBtn").addEventListener("click", deleteSelectedTenantBill);
window.addEventListener("beforeprint", () => {
  if (!document.body.dataset.printView && activeView === "payments") {
    document.body.dataset.printView = "payments";
  }
});
window.addEventListener("afterprint", () => {
  delete document.body.dataset.printView;
});
if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    supabaseSession = session;
    renderAuthState();
    if (session) loadRemittanceProfilesFromCloud({ quiet: true });
    if (session) loadSavedTenantBills({ quiet: true });
  });
}
document.querySelector("#addRemittanceBtn").addEventListener("click", () => {
  const profile = {
    bank: els.newBillBank.value.trim(),
    payee: els.newBillPayee.value.trim(),
    account: els.newBillAccount.value.trim()
  };
  if (!profile.bank && !profile.payee && !profile.account) return;
  remittanceProfiles.push(profile);
  persistRemittanceProfiles();
  renderRemittanceOptions();
  syncRemittanceProfile(remittanceProfiles.length - 1);
  saveRemittanceProfileToCloud(profile, remittanceProfiles.length - 1);
  els.newBillBank.value = "";
  els.newBillPayee.value = "";
  els.newBillAccount.value = "";
  renderTenantBill();
});
document.querySelector("#deleteRemittanceBtn").addEventListener("click", deleteCurrentRemittanceProfile);
document.querySelector("#resetSettlementBtn").addEventListener("click", () => {
  [
    els.settlementAddress,
    els.settlementTenant,
    els.moveOutDate,
    els.utilityStart,
    els.utilityEnd
  ].forEach((element) => {
    element.value = "";
  });
  [
    els.settlementRent,
    els.settlementDeposit,
    els.prepaidRent,
    els.unpaidRent,
    els.damageFee,
    els.otherFee,
    els.electricBillTotal,
    els.waterBillTotal,
    els.sharedOtherFee
  ].forEach((element) => {
    element.value = 0;
  });
  els.utilityBillStatus.value = "pending";
  els.splitMode.value = "usage";
  utilityTenants = [
    { name: "退租租客", start: "", end: "", charge: "tenant", electricPrevious: 0, electricCurrent: 0, waterPrevious: 0, waterCurrent: 0 },
    { name: "其他租客", start: "", end: "", charge: "tenant", electricPrevious: 0, electricCurrent: 0, waterPrevious: 0, waterCurrent: 0 }
  ];
  renderTenantSplitRows();
  renderSettlement();
});
document.querySelectorAll("#settlementView input, #settlementView select").forEach((input) => {
  input.addEventListener("input", renderSettlement);
  input.addEventListener("change", renderSettlement);
});
document.querySelectorAll("#tenantBillView input, #tenantBillView select").forEach((input) => {
  input.addEventListener("input", renderTenantBill);
  input.addEventListener("change", renderTenantBill);
});

els.savedBillSelect.addEventListener("change", loadSelectedTenantBill);

els.billAddress.addEventListener("change", () => {
  billAddressOverride = "";
  applyBillPropertyDefaults(true);
  updateBillDueDate();
  renderTenantBill();
});

[els.billYear, els.billMonth].forEach((select) => {
  select.addEventListener("change", () => {
    billPeriodOverride = "";
    updateBillDueDate();
    renderTenantBill();
  });
});

[els.billBank, els.billAccount, els.billPayee].forEach((select) => {
  select.addEventListener("change", () => {
    syncRemittanceProfile(select.value);
    renderTenantBill();
  });
});

document.addEventListener("click", (event) => {
  const paymentCell = event.target.closest("[data-payment-cell]");
  if (paymentCell) openPaymentDialog(Number(paymentCell.dataset.row), paymentCell.dataset.month);

  const dashboardPayment = event.target.closest("[data-payment-edit]");
  if (dashboardPayment) openPaymentDialog(Number(dashboardPayment.dataset.paymentEdit), dashboardPayment.dataset.month);

  const propertyButton = event.target.closest("[data-property-edit]");
  if (propertyButton) openPropertyDialog(Number(propertyButton.dataset.propertyEdit));

  const propertyDeleteButton = event.target.closest("[data-property-delete]");
  if (propertyDeleteButton) deleteProperty(Number(propertyDeleteButton.dataset.propertyDelete));

  const dialogCancelButton = event.target.closest("[data-dialog-cancel]");
  if (dialogCancelButton) els.dialog.close();

  const splitDeleteButton = event.target.closest("[data-split-delete]");
  if (splitDeleteButton) {
    utilityTenants.splice(Number(splitDeleteButton.dataset.splitDelete), 1);
    renderTenantSplitRows();
    renderSettlement();
  }

  const billDeleteButton = event.target.closest("[data-bill-delete]");
  if (billDeleteButton) {
    billTenants.splice(Number(billDeleteButton.dataset.billDelete), 1);
    renderBillTenantRows();
    renderTenantBill();
  }
});

document.addEventListener("input", (event) => {
  const splitInput = event.target.closest("[data-split-field]");
  if (!splitInput) return;
  const index = Number(splitInput.dataset.splitIndex);
  const field = splitInput.dataset.splitField;
  const numericFields = new Set(["electricPrevious", "electricCurrent", "waterPrevious", "waterCurrent"]);
  utilityTenants[index][field] = numericFields.has(field) ? Number(splitInput.value || 0) : splitInput.value;
  renderSettlement();
});

document.addEventListener("input", (event) => {
  const billInput = event.target.closest("[data-bill-field]");
  if (!billInput) return;
  const index = Number(billInput.dataset.billIndex);
  const field = billInput.dataset.billField;
  const numericFields = new Set(["rent", "other", "electricPrevious", "electricCurrent", "waterPrevious", "waterCurrent"]);
  billTenants[index][field] = numericFields.has(field) ? Number(billInput.value || 0) : billInput.value;
  renderTenantBill();
});

render();
loadSupabaseSession();


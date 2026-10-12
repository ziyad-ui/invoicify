import http from "./http.js";

/**
 * One function per backend endpoint. Pages never call axios directly, so
 * if an endpoint changes there is exactly one place to edit.
 * Forms use camelCase; the API expects snake_case — mapped here.
 */
const body = (promise) => promise.then((res) => res.data);
const data = (promise) => body(promise).then((res) => res.data);

export const authApi = {
  // The role is NOT sent: the server decides it from the account.
  login: ({ email, password }) => body(http.post("/login", { email, password })),
  // Which kind of account an email belongs to — only used for the login screen's hint. Resolves to { role, label }.
  checkRole: (email) => body(http.get("/auth/check-role", { params: { email } })),
  me: () => body(http.get("/me")),
  logout: () => http.post("/logout"),
};

// Self-service account edits for every role (profile drawer in the top-right menu).
// Each resolves to { message, user } with the refreshed session user.
export const profileApi = {
  updateName: (name) => body(http.post("/user/update-profile", { name })),
  updateEmail: ({ email, currentPassword }) =>
    body(http.post("/user/update-email", { email, current_password: currentPassword })),
  changePassword: (f) =>
    body(
      http.post("/user/change-password", {
        current_password: f.currentPassword,
        password: f.password,
        password_confirmation: f.passwordConfirmation,
      })
    ),
};

export const dashboardApi = {
  get: () => data(http.get("/dashboard")),
};

export const clientsApi = {
  list: (params) => data(http.get("/clients", { params })),
  get: (id) => data(http.get(`/clients/${id}`)),
  // Resolves to { data: client, welcomeEmail: { sent, error }, temporaryPassword }
  // temporaryPassword is only present when the welcome email could not be sent.
  create: (f) =>
    body(
      http.post("/clients", {
        name: f.name,
        email: f.email,
        phone: f.phone || null,
        property_name: f.propertyName,
        property_type: f.propertyType,
        total_price: f.totalPrice,
        monthly_amount: f.monthlyAmount,
        term_months: f.termMonths,
        first_due_date: f.firstDueDate,
      })
    ),
  update: (id, f) =>
    data(
      http.put(`/clients/${id}`, {
        name: f.name,
        email: f.email,
        phone: f.phone || null,
        property_name: f.propertyName,
        property_type: f.propertyType,
        total_price: f.totalPrice,
        monthly_amount: f.monthlyAmount,
        term_months: f.termMonths,
      })
    ),
  // list({ archived: 1 }) returns archived clients instead of active ones.
  archive: (id) => http.delete(`/clients/${id}`),
  restore: (id) => data(http.post(`/clients/${id}/restore`)),
  // Owner only; erases an archived client's invoices and payments for good.
  deletePermanently: (id) => http.delete(`/clients/${id}/permanent`),
  // Resolves to { email, temporaryPassword } - shown once
  resetPassword: (id) => body(http.post(`/clients/${id}/reset-password`)),
  // Bulk-create clients from an .xlsx / .csv file. Resolves to { message, imported, pastDueCount, clients: [...] }
  importFile: (file) => {
    const form = new FormData();
    form.append("file", file);
    return body(http.post("/clients/import", form));
  },
  // Resolves to { data: updatedClient, payment }
  recordPayment: (id, f) =>
    body(
      http.post(`/clients/${id}/payments`, {
        amount: f.amount,
        mode: f.mode,
        reference: f.reference || null,
        paid_at: f.paidAt || null,
      })
    ),
};

export const staffApi = {
  list: () => data(http.get("/staff")),
  // Resolves to { data: staff, temporaryPassword }
  create: (f) => body(http.post("/staff", { name: f.name, email: f.email })),
  update: (id, patch) => data(http.patch(`/staff/${id}`, patch)),
  remove: (id) => http.delete(`/staff/${id}`),
  // Resolves to { data: staff, temporaryPassword, emailed }
  resetPassword: (id) => body(http.post(`/staff/${id}/reset-password`)),
};

export const invoicesApi = {
  list: (params) => data(http.get("/invoices", { params })),
};

export const paymentsApi = {
  list: (params) => data(http.get("/payments", { params })),
};

export const notificationsApi = {
  list: () => data(http.get("/notifications")),
  resend: (id) => data(http.post(`/notifications/${id}/resend`)),
};

export const reportsApi = {
  summary: () => data(http.get("/reports/summary")),
  exportXlsx: () => http.get("/reports/export", { responseType: "blob" }).then((res) => res.data),
};

export const portalApi = {
  me: () => data(http.get("/portal/me")),
  notifications: () => data(http.get("/portal/notifications")),
};

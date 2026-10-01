import http from "./http.js";

/**
 * One function per backend endpoint. Pages never call axios directly, so
 * if an endpoint changes there is exactly one place to edit.
 * Forms use camelCase; the API expects snake_case — mapped here.
 */
const body = (promise) => promise.then((res) => res.data);
const data = (promise) => body(promise).then((res) => res.data);

export const authApi = {
  login: ({ email, password, role }) => body(http.post("/login", { email, password, role })),
  me: () => body(http.get("/me")),
  logout: () => http.post("/logout"),
};

export const dashboardApi = {
  get: () => data(http.get("/dashboard")),
};

export const clientsApi = {
  list: (params) => data(http.get("/clients", { params })),
  get: (id) => data(http.get(`/clients/${id}`)),
  // Resolves to { data: client, temporaryPassword }
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
      })
    ),
  archive: (id) => http.delete(`/clients/${id}`),
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
};

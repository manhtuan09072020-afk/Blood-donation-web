import client from './client';

// Gom toàn bộ lời gọi API theo từng nghiệp vụ (khớp với Controllers của backend .NET)

export const authApi = {
  login: (data) => client.post('/auth/login', data),
  registerDonor: (data) => client.post('/auth/register-donor', data),
  me: () => client.get('/auth/me'),
  changePassword: (data) => client.post('/auth/change-password', data)
};

export const campaignApi = {
  getAll: (params) => client.get('/campaigns', { params }),
  getById: (id) => client.get(`/campaigns/${id}`),
  create: (data) => client.post('/campaigns', data),
  update: (id, data) => client.put(`/campaigns/${id}`, data),
  updateStatus: (id, trangThai) => client.put(`/campaigns/${id}/status`, { trangThai }),
  getSites: () => client.get('/campaigns/sites'),
  getAllSites: () => client.get('/campaigns/sites/all'),
  createSite: (data) => client.post('/campaigns/sites', data),
  updateSite: (id, data) => client.put(`/campaigns/sites/${id}`, data),
  setSiteActive: (id, active) => client.put(`/campaigns/sites/${id}/active`, null, { params: { active } })
};

export const donorApi = {
  getAll: (params) => client.get('/donors', { params }),
  getById: (id) => client.get(`/donors/${id}`),
  create: (data) => client.post('/donors', data),
  getHistory: (id) => client.get(`/donors/${id}/history`),
  update: (id, data) => client.put(`/donors/${id}`, data),
  setActive: (id, active) => client.put(`/donors/${id}/active`, null, { params: { active } }),
  getMe: () => client.get('/donors/me'),
  updateMe: (data) => client.put('/donors/me', data),
  getMyHistory: () => client.get('/donors/me/history')
};

export const registrationApi = {
  getAll: (params) => client.get('/registrations', { params }),
  getMine: () => client.get('/registrations/me'),
  create: (data) => client.post('/registrations', data),
  walkIn: (data) => client.post('/registrations/walk-in', data),
  updateStatus: (id, data) => client.put(`/registrations/${id}/status`, data),
  cancel: (id) => client.put(`/registrations/${id}/cancel`)
};

export const screeningApi = {
  getAll: (params) => client.get('/screening', { params }),
  create: (data) => client.post('/screening', data)
};

export const collectionApi = {
  getAll: (params) => client.get('/collection', { params }),
  getPending: () => client.get('/collection/pending'),
  create: (data) => client.post('/collection', data)
};

export const inventoryApi = {
  getUnits: (params) => client.get('/inventory/units', { params }),
  getSummary: () => client.get('/inventory/summary'),
  getAlerts: () => client.get('/inventory/alerts'),
  suggest: (params) => client.get('/inventory/suggest', { params }),
  issue: (data) => client.post('/inventory/issue', data),
  getIssues: (params) => client.get('/inventory/issues', { params }),
  getIssue: (id) => client.get(`/inventory/issues/${id}`),
  discard: (id) => client.put(`/inventory/units/${id}/discard`),
  updateLocation: (id, viTriLuuTru) => client.put(`/inventory/units/${id}/location`, { viTriLuuTru })
};

export const catalogApi = {
  getBloodGroups: () => client.get('/blood-groups'),
  updateBloodGroup: (id, data) => client.put(`/blood-groups/${id}`, data),
  getFacilities: (all = false) => client.get('/facilities', { params: { all } }),
  createFacility: (data) => client.post('/facilities', data),
  updateFacility: (id, data) => client.put(`/facilities/${id}`, data),
  setFacilityActive: (id, active) => client.put(`/facilities/${id}/active`, null, { params: { active } })
};

export const notificationApi = {
  getMine: () => client.get('/notifications/me'),
  unreadCount: () => client.get('/notifications/me/unread-count'),
  markRead: (id) => client.put(`/notifications/${id}/read`),
  markAllRead: () => client.put('/notifications/me/read-all'),
  callForDonation: (data) => client.post('/notifications/call-for-donation', data),
  reminder: (data) => client.post('/notifications/reminder', data),
  periodicReminder: () => client.post('/notifications/periodic-reminder'),
  general: (data) => client.post('/notifications/general', data),
  getCampaigns: (params) => client.get('/notifications/campaigns', { params }),
  getCampaign: (id) => client.get(`/notifications/campaigns/${id}`)
};

export const reportApi = {
  dashboard: () => client.get('/reports/dashboard'),
  bloodTypeStats: () => client.get('/reports/blood-type-stats'),
  monthly: (nam) => client.get('/reports/monthly-stats', { params: { nam } }),
  donors: () => client.get('/reports/donors'),
  campaigns: (params) => client.get('/reports/campaigns', { params }),
  issues: (params) => client.get('/reports/issues', { params }),
  inventory: (params) => client.get('/reports/inventory', { params }),
  publicStats: () => client.get('/reports/public')
};

export const staffApi = {
  getAll: () => client.get('/staff'),
  create: (data) => client.post('/staff', data),
  update: (id, data) => client.put(`/staff/${id}`, data),
  setActive: (id, active) => client.put(`/staff/${id}/active`, null, { params: { active } }),
  resetPassword: (id, newPassword) => client.put(`/staff/${id}/reset-password`, { newPassword })
};

// src/services/meetingApi.js
import axios from "axios";

const meetingHttp = axios.create({
  baseURL: import.meta.env.VITE_MEETING_API_URL || "http://localhost:8091",
});

meetingHttp.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const meetingApi = {
  criar: (data) => meetingHttp.post("/api/meetings", data),
  buscar: (id) => meetingHttp.get(`/api/meetings/${id}`),
  atualizar: (id, data) => meetingHttp.put(`/api/meetings/${id}`, data),
  cancelar: (id) => meetingHttp.patch(`/api/meetings/${id}/cancel`),
  finalizar: (id) => meetingHttp.patch(`/api/meetings/${id}/finalizar`),
  atualizarPresenca: (id, usuarioId, status) =>
    meetingHttp.patch(`/api/meetings/${id}/convidados/${usuarioId}/presenca?status=${status}`),
  avaliar: (id, usuarioId, data) =>
    meetingHttp.post(`/api/meetings/${id}/convidados/${usuarioId}/avaliacoes`, data),
};

export const ataApi = {
  registrar: (meetingId, data) => meetingHttp.post(`/api/meetings/${meetingId}/ata`, data),
  atualizar: (meetingId, data) => meetingHttp.put(`/api/meetings/${meetingId}/ata`, data),
  buscar: (meetingId) => meetingHttp.get(`/api/meetings/${meetingId}/ata`),
};

export const pollApi = {
  criar: (data) => meetingHttp.post("/api/polls", data),
  buscar: (id) => meetingHttp.get(`/api/polls/${id}`),
  atualizar: (id, data) => meetingHttp.put(`/api/polls/${id}`, data),
  encerrar: (id) => meetingHttp.patch(`/api/polls/${id}/close`),
  votar: (id, data) => meetingHttp.post(`/api/polls/${id}/votes`, data),
};

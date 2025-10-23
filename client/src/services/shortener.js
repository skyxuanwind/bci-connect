import axios from '../config/axios';

const shorten = async ({ url, label, tags }) => {
  const { data } = await axios.post('/api/links/shorten', { url, label, tags });
  return data;
};

const bulkShorten = async (items) => {
  const { data } = await axios.post('/api/links/bulk', { items });
  return data;
};

const getStats = async (code) => {
  const { data } = await axios.get(`/api/links/stats/${code}`);
  return data;
};

export default { shorten, bulkShorten, getStats };
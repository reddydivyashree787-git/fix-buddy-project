import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authAPI } from '../api';

const staleTime = 30 * 1000;
const queryOptions = { staleTime, refetchOnWindowFocus: false };
const PAGE_SIZE = 10;

const normalizeList = (res) => {
  const payload = res?.data;
  if (Array.isArray(payload)) return payload;
  if (payload?.results) return payload.results;
  return payload?.data || [];
};

export function useProviders() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  const query = useQuery(['providers'], () => authAPI.getProviders({ page_size: PAGE_SIZE }), {
    ...queryOptions,
  });

  const providers = normalizeList(query.data);

  const filteredProviders = useMemo(() => {
    const lowerSearch = searchText.trim().toLowerCase();
    return providers.filter((provider) => {
      const statusMatch = statusFilter === 'all' || provider.status === statusFilter;
      const candidate = [provider.user?.full_name, provider.user?.email, provider.user?.city].filter(Boolean).join(' ');
      const searchMatch = !lowerSearch || candidate.toLowerCase().includes(lowerSearch);
      return statusMatch && searchMatch;
    });
  }, [providers, searchText, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredProviders.length / PAGE_SIZE));
  const paginatedProviders = filteredProviders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return {
    providers: paginatedProviders,
    rawProviders: providers,
    isLoading: query.isLoading,
    error: query.error,
    statusFilter,
    setStatusFilter,
    searchText,
    setSearchText,
    page,
    setPage,
    pageCount,
    refetch: query.refetch,
  };
}

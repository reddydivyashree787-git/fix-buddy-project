import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authAPI } from '../api';

const staleTime = 30 * 1000;
const queryOptions = { staleTime, refetchOnWindowFocus: false };
const PAGE_SIZE = 10;

const normalizeList = (res) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (data?.results) return data.results;
  return data?.data || [];
};

export function useUsers() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  const query = useQuery(['users'], () => authAPI.getAllUsers(), {
    ...queryOptions,
  });

  const users = normalizeList(query.data);

  const filteredUsers = useMemo(() => {
    const lowerSearch = searchText.trim().toLowerCase();
    return users.filter((user) => {
      const statusMatch = statusFilter === 'all' || (statusFilter === 'active' ? user.is_active : !user.is_active);
      const searchMatch = !lowerSearch || [user.full_name, user.email, user.phone]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(lowerSearch));
      return statusMatch && searchMatch;
    });
  }, [users, searchText, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return {
    users: paginatedUsers,
    rawUsers: users,
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

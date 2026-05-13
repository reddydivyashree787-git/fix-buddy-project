import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { servicesAPI } from '../api';

const staleTime = 30 * 1000;
const queryOptions = { staleTime, refetchOnWindowFocus: false };

const normalizeList = (res) => {
  const payload = res?.data;
  if (Array.isArray(payload)) return payload;
  if (payload?.results) return payload.results;
  return payload?.data || [];
};

export function useCategories() {
  const queryClient = useQueryClient();

  const query = useQuery(['categories'], () => servicesAPI.getCategories(), {
    ...queryOptions,
  });

  const createCategory = useMutation((payload) => servicesAPI.createCategory(payload), {
    onSuccess: () => queryClient.invalidateQueries(['categories']),
  });

  const updateCategory = useMutation(({ id, payload }) => servicesAPI.updateCategory(id, payload), {
    onSuccess: () => queryClient.invalidateQueries(['categories']),
  });

  const deleteCategory = useMutation((id) => servicesAPI.deleteCategory(id), {
    onSuccess: () => queryClient.invalidateQueries(['categories']),
  });

  return {
    categories: normalizeList(query.data),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

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

export function useSubcategories(categoryId) {
  const queryClient = useQueryClient();

  const query = useQuery(['subcategories', categoryId], () => servicesAPI.getSubcategories(categoryId), {
    ...queryOptions,
  });

  const createSubcategory = useMutation((payload) => servicesAPI.createSubcategory(payload), {
    onSuccess: () => queryClient.invalidateQueries(['subcategories']),
  });

  const updateSubcategory = useMutation(({ id, payload }) => servicesAPI.updateSubcategory(id, payload), {
    onSuccess: () => queryClient.invalidateQueries(['subcategories']),
  });

  const deleteSubcategory = useMutation((id) => servicesAPI.deleteSubcategory(id), {
    onSuccess: () => queryClient.invalidateQueries(['subcategories']),
  });

  return {
    subcategories: normalizeList(query.data),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
  };
}

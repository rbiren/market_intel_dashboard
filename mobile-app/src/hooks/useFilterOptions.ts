import { useQuery } from '@apollo/client/react'
import { useMemo } from 'react'
import { GET_REGIONS } from '../graphql/queries/dealerships'
import { GET_RV_TYPES, GET_MANUFACTURERS } from '../graphql/queries/products'
import type { FilterOption } from '../graphql/types/filters'

interface GroupByResult {
  fields: { region?: string | null; rv_type?: string | null; manufacturer?: string | null }
  aggregations: { count: number }
}

interface RegionsResponse {
  dim_dealerships: {
    groupBy: GroupByResult[]
  }
}

interface RvTypesResponse {
  dim_products: {
    groupBy: GroupByResult[]
  }
}

interface ManufacturersResponse {
  dim_products: {
    groupBy: GroupByResult[]
  }
}

/**
 * Hook to fetch filter options for dropdowns (regions, RV types, manufacturers)
 * Uses cache-first strategy since this data rarely changes
 */
export function useFilterOptions() {
  const { data: regionsData, loading: regionsLoading } = useQuery<RegionsResponse>(
    GET_REGIONS,
    {
      fetchPolicy: 'cache-first',
    }
  )

  const { data: rvTypesData, loading: rvTypesLoading } = useQuery<RvTypesResponse>(
    GET_RV_TYPES,
    {
      fetchPolicy: 'cache-first',
    }
  )

  const { data: manufacturersData, loading: manufacturersLoading } =
    useQuery<ManufacturersResponse>(GET_MANUFACTURERS, {
      fetchPolicy: 'cache-first',
    })

  const regions: FilterOption[] = useMemo(() => {
    const groupBy = regionsData?.dim_dealerships?.groupBy
    if (!groupBy) return []
    return groupBy
      .filter((g) => g.fields.region)
      .map((g) => ({
        value: g.fields.region!,
        label: `${g.fields.region} (${g.aggregations.count})`,
      }))
      .sort((a, b) => a.value.localeCompare(b.value))
  }, [regionsData])

  const rvTypes: FilterOption[] = useMemo(() => {
    const groupBy = rvTypesData?.dim_products?.groupBy
    if (!groupBy) return []
    return groupBy
      .filter((g) => g.fields.rv_type)
      .map((g) => ({
        value: g.fields.rv_type!,
        label: `${g.fields.rv_type} (${g.aggregations.count})`,
      }))
      .sort((a, b) => a.value.localeCompare(b.value))
  }, [rvTypesData])

  const manufacturers: FilterOption[] = useMemo(() => {
    const groupBy = manufacturersData?.dim_products?.groupBy
    if (!groupBy) return []
    return groupBy
      .filter((g) => g.fields.manufacturer)
      .map((g) => ({
        value: g.fields.manufacturer!,
        label: `${g.fields.manufacturer} (${g.aggregations.count})`,
      }))
      .sort((a, b) => a.value.localeCompare(b.value))
  }, [manufacturersData])

  return {
    regions,
    rvTypes,
    manufacturers,
    loading: regionsLoading || rvTypesLoading || manufacturersLoading,
  }
}

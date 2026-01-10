/**
 * Product Catalog
 *
 * Browse and present RV products to dealers
 * Includes specs, features, and marketing materials
 */

import { useState, useMemo } from 'react'
import { useSalesContext } from '../../context/SalesContext'
import { useProductCatalog } from '../../hooks/useSalesData'
import type { Product } from '../../hooks/useSalesData'

type FilterType = 'all' | 'TRAVEL TRAILER' | 'FIFTH WHEEL' | 'CLASS A' | 'CLASS B' | 'CLASS C'

export function ProductCatalog() {
  const { theme, viewMode: deviceView } = useSalesContext()
  const [rvTypeFilter, setRvTypeFilter] = useState<FilterType>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { products } = useProductCatalog({
    rvType: rvTypeFilter === 'all' ? undefined : rvTypeFilter
  })

  const isDark = theme === 'dark'
  const isMobile = deviceView === 'mobile'

  // Filter by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products
    const query = searchQuery.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.manufacturer.toLowerCase().includes(query) ||
      p.model.toLowerCase().includes(query)
    )
  }, [products, searchQuery])

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`

  const rvTypes: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All Types' },
    { id: 'TRAVEL TRAILER', label: 'Travel Trailer' },
    { id: 'FIFTH WHEEL', label: 'Fifth Wheel' },
    { id: 'CLASS A', label: 'Class A' },
    { id: 'CLASS B', label: 'Class B' },
    { id: 'CLASS C', label: 'Class C' },
  ]

  const ProductCard = ({ product }: { product: Product }) => (
    <div
      onClick={() => setSelectedProduct(product)}
      className={`
        rounded-xl overflow-hidden cursor-pointer transition-all duration-200
        ${isDark ? 'bg-[#232322] border border-white/10 hover:border-[#495737]/50' : 'bg-white border border-[#d9d6cf] shadow-sm hover:shadow-lg'}
        hover:-translate-y-1
      `}
    >
      {/* Image placeholder */}
      <div className={`
        h-40 flex items-center justify-center
        ${isDark ? 'bg-gradient-to-br from-[#495737]/20 to-[#577d91]/20' : 'bg-gradient-to-br from-[#495737]/10 to-[#577d91]/10'}
      `}>
        <svg className={`w-16 h-16 ${isDark ? 'text-[#495737]/40' : 'text-[#495737]/30'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`
            px-2 py-0.5 text-xs font-semibold rounded
            ${product.rvType.includes('CLASS') ? 'bg-[#577d91]/10 text-[#577d91]' : 'bg-[#495737]/10 text-[#495737]'}
          `}>
            {product.rvType}
          </span>
          <span className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
            {product.year}
          </span>
        </div>

        {/* Name */}
        <h3 className={`font-bold text-lg mb-1 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          {product.name}
        </h3>
        <p className={`text-sm mb-3 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
          {product.manufacturer} {product.model}
        </p>

        {/* Specs */}
        <div className="flex items-center gap-4 text-sm mb-3">
          <div className="flex items-center gap-1">
            <svg className={`w-4 h-4 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className={isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}>Sleeps {product.sleeps}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className={`w-4 h-4 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
            <span className={isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}>{product.length}</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <span className={`text-xl font-bold text-[#495737]`}>
            {formatCurrency(product.msrp)}
          </span>
          <span className={`text-xs uppercase ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
            MSRP
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
      {/* Header */}
      <div className={`px-4 py-4`}>
        <h1 className={`text-xl font-bold mb-1 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Product Catalog
        </h1>
        <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
          Browse products to present to dealers
        </p>
      </div>

      {/* Search and Filters */}
      <div className={`
        sticky top-14 z-30 px-4 py-3
        ${isDark ? 'bg-[#181817]/95 border-b border-white/10' : 'bg-[#fffdfa]/95 border-b border-[#d9d6cf]'}
        backdrop-blur-md
      `}>
        {/* Search */}
        <div className="relative mb-3">
          <svg
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`
              w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all duration-200
              ${isDark
                ? 'bg-[#232322] border-white/10 text-[#fffdfa] placeholder-[#8c8a7e] focus:border-[#495737]'
                : 'bg-white border-[#d9d6cf] text-[#181817] placeholder-[#8c8a7e] focus:border-[#495737]'
              }
              focus:outline-none focus:ring-2 focus:ring-[#495737]/20
            `}
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {rvTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setRvTypeFilter(type.id)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${rvTypeFilter === type.id
                  ? 'bg-[#495737] text-white'
                  : isDark
                    ? 'bg-white/5 text-[#8c8a7e] hover:bg-white/10'
                    : 'bg-[#f7f4f0] text-[#595755] hover:bg-[#e8e5e0]'
                }
              `}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="px-4 py-4">
        {filteredProducts.length === 0 ? (
          <div className={`
            text-center py-12 rounded-xl
            ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf]'}
          `}>
            <svg className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-[#8c8a7e]/30' : 'text-[#d9d6cf]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className={`font-semibold mb-1 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
              No products found
            </h3>
            <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`
              relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl
              ${isDark ? 'bg-[#181817]' : 'bg-[#fffdfa]'}
              shadow-2xl
            `}
          >
            {/* Header Image */}
            <div className={`
              h-48 flex items-center justify-center relative
              ${isDark ? 'bg-gradient-to-br from-[#495737]/30 to-[#577d91]/30' : 'bg-gradient-to-br from-[#495737]/15 to-[#577d91]/15'}
            `}>
              <svg className={`w-24 h-24 ${isDark ? 'text-[#495737]/50' : 'text-[#495737]/40'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>

              {/* Close button */}
              <button
                onClick={() => setSelectedProduct(null)}
                className={`
                  absolute top-4 right-4 p-2 rounded-full
                  ${isDark ? 'bg-black/30 hover:bg-black/50' : 'bg-white/80 hover:bg-white'}
                  transition-colors
                `}
              >
                <svg className={`w-5 h-5 ${isDark ? 'text-white' : 'text-[#181817]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Badge & Year */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`
                  px-2 py-0.5 text-xs font-semibold rounded
                  ${selectedProduct.rvType.includes('CLASS') ? 'bg-[#577d91]/10 text-[#577d91]' : 'bg-[#495737]/10 text-[#495737]'}
                `}>
                  {selectedProduct.rvType}
                </span>
                <span className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  {selectedProduct.year}
                </span>
              </div>

              {/* Title */}
              <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                {selectedProduct.name}
              </h2>
              <p className={`mb-4 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                {selectedProduct.manufacturer} {selectedProduct.model}
              </p>

              {/* Price */}
              <div className={`
                p-4 rounded-xl mb-4
                ${isDark ? 'bg-[#495737]/20' : 'bg-[#495737]/10'}
              `}>
                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  MSRP
                </p>
                <p className="text-3xl font-bold text-[#495737]">
                  {formatCurrency(selectedProduct.msrp)}
                </p>
              </div>

              {/* Description */}
              <p className={`mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                {selectedProduct.description}
              </p>

              {/* Specs Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className={`
                  p-3 rounded-lg text-center
                  ${isDark ? 'bg-white/5' : 'bg-[#f7f4f0]'}
                `}>
                  <p className={`text-xs font-medium uppercase ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    Sleeps
                  </p>
                  <p className={`text-xl font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    {selectedProduct.sleeps}
                  </p>
                </div>
                <div className={`
                  p-3 rounded-lg text-center
                  ${isDark ? 'bg-white/5' : 'bg-[#f7f4f0]'}
                `}>
                  <p className={`text-xs font-medium uppercase ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    Length
                  </p>
                  <p className={`text-xl font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    {selectedProduct.length}
                  </p>
                </div>
                <div className={`
                  p-3 rounded-lg text-center
                  ${isDark ? 'bg-white/5' : 'bg-[#f7f4f0]'}
                `}>
                  <p className={`text-xs font-medium uppercase ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    Weight
                  </p>
                  <p className={`text-lg font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    {selectedProduct.weight}
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h4 className={`font-semibold mb-2 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  Key Features
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.features.map((feature, i) => (
                    <span
                      key={i}
                      className={`
                        px-3 py-1 rounded-full text-sm
                        ${isDark ? 'bg-white/10 text-[#fffdfa]' : 'bg-[#f7f4f0] text-[#181817]'}
                      `}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button className="flex-1 py-3 rounded-xl bg-[#495737] text-white font-semibold hover:bg-[#3d4a2e] transition-colors">
                  Share with Dealer
                </button>
                <button className={`
                  p-3 rounded-xl transition-colors
                  ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-[#f7f4f0] hover:bg-[#e8e5e0]'}
                `}>
                  <svg className={`w-6 h-6 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductCatalog

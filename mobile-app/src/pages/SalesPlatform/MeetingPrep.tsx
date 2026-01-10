/**
 * Meeting Prep
 *
 * Prepare for dealer meetings with insights and talking points
 */

import { useMemo } from 'react'
import { useSalesContext } from '../../context/SalesContext'
import { useDealerDetail, useProductCatalog } from '../../hooks/useSalesData'
import { StatCard } from '../../components/sales/StatCard'

export function MeetingPrep() {
  const { theme, viewMode, selectedDealer, setCurrentView } = useSalesContext()
  const { data: dealerData, loading } = useDealerDetail(selectedDealer?.name || null)
  const { products } = useProductCatalog({})

  const isDark = theme === 'dark'
  const isMobile = viewMode === 'mobile'

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  // Generate talking points based on dealer data
  const talkingPoints = useMemo(() => {
    if (!dealerData) return []
    const points = []

    // Inventory volume
    points.push({
      category: 'Inventory',
      point: `Currently carrying ${dealerData.total_units?.toLocaleString() || 0} units worth ${formatCurrency(dealerData.total_value || 0)}`,
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
    })

    // Condition mix
    const newUnits = dealerData.by_condition?.find(c => c.name === 'NEW')?.count || 0
    const usedUnits = dealerData.by_condition?.find(c => c.name === 'USED')?.count || 0
    const newPercentage = dealerData.total_units ? Math.round((newUnits / dealerData.total_units) * 100) : 0
    points.push({
      category: 'Condition Mix',
      point: `${newPercentage}% new inventory (${newUnits} new, ${usedUnits} used)`,
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    })

    // Top RV type
    if (dealerData.by_rv_type?.[0]) {
      const topType = dealerData.by_rv_type[0]
      const typePercentage = dealerData.total_units ? Math.round((topType.count / dealerData.total_units) * 100) : 0
      points.push({
        category: 'Product Focus',
        point: `Primary focus on ${topType.name} (${typePercentage}% of inventory)`,
        icon: 'M13 10V3L4 14h7v7l9-11h-7z'
      })
    }

    // Price point
    points.push({
      category: 'Price Point',
      point: `Average unit price: ${formatCurrency(dealerData.avg_price || 0)} (range: ${formatCurrency(dealerData.min_price || 0)} - ${formatCurrency(dealerData.max_price || 0)})`,
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    })

    return points
  }, [dealerData])

  // Generate opportunity suggestions
  const opportunities = useMemo(() => {
    if (!dealerData) return []
    const opps = []

    // Check for missing RV types
    const currentTypes = new Set(dealerData.by_rv_type?.map(t => t.name) || [])
    const allTypes = ['TRAVEL TRAILER', 'FIFTH WHEEL', 'CLASS A', 'CLASS B', 'CLASS C']
    const missingTypes = allTypes.filter(t => !currentTypes.has(t))

    if (missingTypes.length > 0) {
      opps.push({
        title: 'Expand RV Type Coverage',
        description: `Dealer doesn't carry: ${missingTypes.slice(0, 2).join(', ')}`,
        priority: 'high',
        action: 'Introduce our lineup in these categories'
      })
    }

    // Check inventory balance
    const newUnits = dealerData.by_condition?.find(c => c.name === 'NEW')?.count || 0
    const totalUnits = dealerData.total_units || 1
    const newRatio = newUnits / totalUnits

    if (newRatio < 0.5) {
      opps.push({
        title: 'Increase New Inventory',
        description: `Only ${Math.round(newRatio * 100)}% new units - industry average is 60%+`,
        priority: 'medium',
        action: 'Propose new unit stocking program'
      })
    }

    // Price tier opportunity
    if (dealerData.avg_price && dealerData.avg_price < 50000) {
      opps.push({
        title: 'Premium Segment Opportunity',
        description: 'Low average price point suggests room for premium units',
        priority: 'medium',
        action: 'Introduce luxury Class A options'
      })
    }

    // Add default opportunity if none found
    if (opps.length === 0) {
      opps.push({
        title: 'Strengthen Partnership',
        description: 'Well-balanced dealer with growth potential',
        priority: 'low',
        action: 'Discuss volume incentives and marketing support'
      })
    }

    return opps
  }, [dealerData])

  // Recommended products based on dealer gaps
  const recommendedProducts = useMemo(() => {
    if (!dealerData?.by_rv_type) return products.slice(0, 3)

    const currentTypes = new Set(dealerData.by_rv_type.map(t => t.name))
    const missing = products.filter(p => !currentTypes.has(p.rvType))

    if (missing.length > 0) return missing.slice(0, 3)
    return products.slice(0, 3)
  }, [dealerData, products])

  if (!selectedDealer) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isMobile ? 'pb-20' : ''}`}>
        <div className="text-center px-4">
          <svg className={`w-20 h-20 mx-auto mb-4 ${isDark ? 'text-[#8c8a7e]/30' : 'text-[#d9d6cf]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Select a Dealer First
          </h2>
          <p className={`mb-6 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
            Choose a dealer from the directory to prepare for your meeting
          </p>
          <button
            onClick={() => setCurrentView('dealers')}
            className="px-6 py-3 rounded-xl bg-[#495737] text-white font-semibold hover:bg-[#3d4a2e] transition-colors"
          >
            Browse Dealers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
      {/* Header */}
      <div className={`
        px-4 py-6
        ${isDark ? 'bg-gradient-to-br from-[#a46807]/20 to-transparent' : 'bg-gradient-to-br from-[#a46807]/10 to-transparent'}
      `}>
        <div className="flex items-center gap-2 mb-2">
          <svg className={`w-5 h-5 ${isDark ? 'text-[#a46807]' : 'text-[#a46807]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`text-sm font-medium ${isDark ? 'text-[#a46807]' : 'text-[#a46807]'}`}>
            Meeting Prep
          </span>
        </div>
        <h1 className={`text-2xl font-bold mb-1 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          {selectedDealer.name}
        </h1>
        <p className={`${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
          {selectedDealer.city ? `${selectedDealer.city}, ${selectedDealer.state}` : selectedDealer.state || 'Multiple Locations'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className={`px-4 mb-4 grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <StatCard
          label="Units"
          value={dealerData?.total_units || 0}
          color="sage"
          size="sm"
        />
        <StatCard
          label="Value"
          value={formatCurrency(dealerData?.total_value || 0)}
          color="gold"
          size="sm"
        />
        <StatCard
          label="Avg Price"
          value={formatCurrency(dealerData?.avg_price || 0)}
          color="steel"
          size="sm"
        />
        <StatCard
          label="RV Types"
          value={dealerData?.by_rv_type?.length || 0}
          color="neutral"
          size="sm"
        />
      </div>

      {/* Talking Points */}
      <div className="px-4 mb-6">
        <h3 className={`font-semibold mb-3 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Key Talking Points
        </h3>
        <div className={`
          rounded-xl overflow-hidden
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-8 h-8 border-2 border-[#495737] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            talkingPoints.map((point, i) => (
              <div
                key={i}
                className={`
                  flex items-start gap-3 p-4
                  ${i < talkingPoints.length - 1 ? isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50' : ''}
                `}
              >
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                  bg-[#495737]/10
                `}>
                  <svg className="w-5 h-5 text-[#495737]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={point.icon} />
                  </svg>
                </div>
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider mb-0.5 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    {point.category}
                  </p>
                  <p className={`font-medium ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    {point.point}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Opportunities */}
      <div className="px-4 mb-6">
        <h3 className={`font-semibold mb-3 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Opportunities to Present
        </h3>
        <div className="space-y-3">
          {opportunities.map((opp, i) => (
            <div
              key={i}
              className={`
                p-4 rounded-xl border-l-4
                ${opp.priority === 'high' ? 'border-l-[#a46807]' : ''}
                ${opp.priority === 'medium' ? 'border-l-[#577d91]' : ''}
                ${opp.priority === 'low' ? 'border-l-[#495737]' : ''}
                ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  {opp.title}
                </h4>
                <span className={`
                  text-xs font-semibold uppercase px-2 py-0.5 rounded
                  ${opp.priority === 'high' ? 'bg-[#a46807]/10 text-[#a46807]' : ''}
                  ${opp.priority === 'medium' ? 'bg-[#577d91]/10 text-[#577d91]' : ''}
                  ${opp.priority === 'low' ? 'bg-[#495737]/10 text-[#495737]' : ''}
                `}>
                  {opp.priority}
                </span>
              </div>
              <p className={`text-sm mb-2 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                {opp.description}
              </p>
              <div className={`
                flex items-center gap-2 text-sm font-medium
                ${opp.priority === 'high' ? 'text-[#a46807]' : ''}
                ${opp.priority === 'medium' ? 'text-[#577d91]' : ''}
                ${opp.priority === 'low' ? 'text-[#495737]' : ''}
              `}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                {opp.action}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products to Present */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Products to Present
          </h3>
          <button
            onClick={() => setCurrentView('products')}
            className={`text-sm font-medium ${isDark ? 'text-[#577d91]' : 'text-[#577d91]'} hover:underline`}
          >
            View All
          </button>
        </div>
        <div className="space-y-3">
          {recommendedProducts.map((product) => (
            <div
              key={product.id}
              className={`
                flex items-center gap-4 p-3 rounded-xl
                ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
              `}
            >
              <div className={`
                w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0
                ${isDark ? 'bg-[#495737]/20' : 'bg-[#495737]/10'}
              `}>
                <svg className="w-8 h-8 text-[#495737]/50" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  {product.name}
                </p>
                <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  {product.rvType} | {product.year}
                </p>
                <p className="text-sm font-semibold text-[#495737]">
                  {formatCurrency(product.msrp)}
                </p>
              </div>
              <button className={`
                p-2 rounded-lg transition-colors
                ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f7f4f0]'}
              `}>
                <svg className={`w-5 h-5 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Meeting Checklist */}
      <div className="px-4 mb-6">
        <h3 className={`font-semibold mb-3 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Pre-Meeting Checklist
        </h3>
        <div className={`
          p-4 rounded-xl
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          {[
            { text: 'Review dealer\'s current inventory', checked: true },
            { text: 'Prepare product presentations', checked: true },
            { text: 'Check for any open orders/quotes', checked: false },
            { text: 'Review competitive positioning', checked: false },
            { text: 'Prepare pricing/incentive offers', checked: false },
          ].map((item, i) => (
            <label
              key={i}
              className={`
                flex items-center gap-3 py-2 cursor-pointer
                ${i < 4 ? isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50' : ''}
              `}
            >
              <div className={`
                w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                ${item.checked
                  ? 'bg-[#495737] border-[#495737]'
                  : isDark
                    ? 'border-[#8c8a7e]/50'
                    : 'border-[#d9d6cf]'
                }
              `}>
                {item.checked && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`
                ${item.checked ? 'line-through opacity-60' : ''}
                ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}
              `}>
                {item.text}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 mb-6">
        <div className={`flex gap-3 ${isMobile ? 'flex-col' : ''}`}>
          <button
            onClick={() => setCurrentView('dealer-detail')}
            className="flex-1 py-3 px-4 rounded-xl bg-[#495737] text-white font-semibold hover:bg-[#3d4a2e] transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            View Full Profile
          </button>
          <button className={`
            flex-1 py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2
            ${isDark
              ? 'bg-white/10 text-[#fffdfa] hover:bg-white/20 border border-white/10'
              : 'bg-[#f7f4f0] text-[#181817] hover:bg-[#e8e5e0] border border-[#d9d6cf]'
            }
          `}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call Dealer
          </button>
        </div>
      </div>
    </div>
  )
}

export default MeetingPrep

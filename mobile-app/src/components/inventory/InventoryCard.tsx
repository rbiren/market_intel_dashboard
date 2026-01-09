import type { EnrichedInventoryItem } from '../../utils/dataEnrichment'
import { formatCurrency } from '../../utils/formatters'

interface InventoryCardProps {
  item: EnrichedInventoryItem
  onClick?: () => void
}

export function InventoryCard({ item, onClick }: InventoryCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: item.overpriced_unit ? '#fef2f2' : '#ffffff',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Header: Manufacturer Logo + Model */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {item.manufacturer_logo && (
          <img
            src={item.manufacturer_logo}
            alt={item.manufacturer}
            style={{ width: '32px', height: '32px', objectFit: 'contain' }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: '600',
              fontSize: '16px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.manufacturer} {item.model}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {item.rv_type}
            {item.floorplan && ` - ${item.floorplan}`}
          </div>
        </div>
      </div>

      {/* Price and Days on Lot */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '12px',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669' }}>
            {formatCurrency(item.price)}
          </div>
          {item.overpriced_unit && (
            <div style={{ fontSize: '12px', color: '#dc2626' }}>
              {item.percent_over_median.toFixed(0)}% over median
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color:
                item.days_on_lot > 90
                  ? '#dc2626'
                  : item.days_on_lot > 60
                    ? '#f59e0b'
                    : '#6b7280',
            }}
          >
            {item.days_on_lot} days
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>on lot</div>
        </div>
      </div>

      {/* Dealership Location */}
      <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
        {item.dealership_name} - {item.city}, {item.state}
      </div>

      {/* Stock Number and Condition */}
      <div
        style={{
          marginTop: '4px',
          fontSize: '12px',
          color: '#9ca3af',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Stock: {item.stock_number}</span>
        <span
          style={{
            backgroundColor: item.condition === 'New' ? '#dcfce7' : '#f3f4f6',
            color: item.condition === 'New' ? '#166534' : '#4b5563',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
          }}
        >
          {item.condition}
        </span>
      </div>
    </div>
  )
}

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

export type ChartRow = {
  shortName: string
  fullName: string
  value: number
}

export type ChartMeta = {
  title: string
  subtitle: string
  fill: string
}

type Props = {
  chartRows: ChartRow[]
  chartMeta: ChartMeta
}

export default function AnalyticsTopBusinessesChart({ chartRows, chartMeta }: Props) {
  return (
    <div className="h-[280px] w-full sm:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={chartRows} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7e5e4" />
          <XAxis type="number" tick={{ fontSize: 12, fill: '#57534e' }} axisLine={{ stroke: '#d6d3d1' }} />
          <YAxis
            type="category"
            dataKey="shortName"
            width={118}
            tick={{ fontSize: 11, fill: '#57534e' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [Number(value ?? 0), chartMeta.title]}
            labelFormatter={(_, payload) =>
              (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName ?? ''
            }
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #e7e5e4',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
            }}
          />
          <Bar
            dataKey="value"
            name={chartMeta.title}
            fill={chartMeta.fill}
            radius={[0, 8, 8, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

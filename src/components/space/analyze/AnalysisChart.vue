<template>
  <div
    ref="container"
    class="analysis-chart"
    role="img"
    :aria-label="label"
    :style="{ height: `${height}px` }"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { init, use, type EChartsType } from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { AnalysisChartOption } from './chartOptions'

use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, AriaComponent, CanvasRenderer])

const props = withDefaults(
  defineProps<{ option: AnalysisChartOption; label: string; height?: number }>(),
  { height: 280 },
)
const container = ref<HTMLDivElement>()
let chart: EChartsType | undefined
let observer: ResizeObserver | undefined
let frame = 0

const render = () => {
  if (!container.value?.clientWidth) return
  chart ??= init(container.value)
  chart.setOption(
    {
      color: ['#1677ff'],
      animation: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      animationDuration: 450,
      textStyle: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
      },
      aria: { enabled: true, label: { description: props.label } },
      ...props.option,
    },
    { notMerge: true },
  )
}

onMounted(() => {
  render()
  observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const element = container.value
      if (!element?.clientWidth) return
      if (!chart) render()
      else if (
        chart.getWidth() !== element.clientWidth ||
        chart.getHeight() !== element.clientHeight
      ) {
        chart.resize()
      }
    })
  })
  if (container.value) observer.observe(container.value)
})

watch(() => props.option, render)
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  observer?.disconnect()
  chart?.dispose()
})
</script>

<style scoped>
.analysis-chart {
  width: 100%;
  min-width: 0;
  overflow: hidden;
}
</style>

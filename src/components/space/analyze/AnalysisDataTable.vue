<template>
  <details class="analysis-data">
    <summary>查看数据明细</summary>
    <div class="table-scroll">
      <table>
        <caption>
          {{
            caption
          }}
        </caption>
        <thead>
          <tr>
            <th v-for="column in columns" :key="column" scope="col">{{ column }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in rows" :key="index">
            <td v-for="(value, cell) in row" :key="cell">{{ value }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </details>
</template>

<script setup lang="ts">
defineProps<{ caption: string; columns: string[]; rows: (string | number)[][] }>()
</script>

<style scoped>
.analysis-data {
  margin-top: 16px;
  border-top: 1px solid #edf1f6;
  padding-top: 12px;
  font-size: 13px;
}

summary {
  width: fit-content;
  color: #475569;
  cursor: pointer;
}

summary:hover {
  color: #0958d9;
}

summary:focus-visible {
  outline: 2px solid #1677ff;
  outline-offset: 4px;
}

.table-scroll {
  max-height: 280px;
  overflow: auto;
  margin-top: 12px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

caption {
  text-align: left;
  padding-bottom: 8px;
  color: #475569;
}

th,
td {
  padding: 9px 12px;
  border-bottom: 1px solid #edf1f6;
  text-align: right;
  overflow-wrap: anywhere;
}

th:first-child,
td:first-child {
  text-align: left;
}

th {
  color: #475569;
  background: #f8fafc;
  font-weight: 500;
}
</style>

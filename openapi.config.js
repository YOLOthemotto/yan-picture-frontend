import { generateService } from '@umijs/openapi'

generateService({
  requestLibPath: "import request from '@/request'",
  schemaPath: 'http://localhost:8123/api/v2/api-docs',
  serversPath: './src',
})
  .then((r) => console.log('generateService success', r))
  .catch((e) => console.error('generateService error', e))

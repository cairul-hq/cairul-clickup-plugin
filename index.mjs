import {
  bearer,
  connection,
  error,
  includesAll,
  matchesState,
  resourceCheck,
  segment,
  stateOption,
  target,
  text,
  verdict,
  z,
} from '@cairul/plugin-kit';

export default function clickup(options) {
  const api = connection(options, {
    prefix: 'CLICKUP',
    baseUrl: 'https://api.clickup.com/api/v2',
    tokenEnv: 'CLICKUP_TOKEN',
    required: true,
    authModes: { 'api-token': (token) => ({ authorization: token }), bearer },
  });
  const task = (shape, evaluate) =>
    resourceCheck({
      api,
      identifier: 'task',
      parseURL: (url) => target(undefined, url, ['app.clickup.com', api.host], /\/t\/([^/]+)(?:\/|$)/),
      path: (id) => `task/${segment(id)}`,
      shape,
      evaluate,
    });
  return {
    checkKinds: {
      'clickup.task-status': task({ state: stateOption }, ({ status }, { state }) =>
        matchesState(status?.status, state, 'Task')
      ),
      'clickup.task-tags': task({ tags: z.array(text).min(1) }, ({ tags }, inputs) =>
        includesAll(
          tags?.map(({ name }) => name),
          inputs.tags,
          'task tags'
        )
      ),
      'clickup.task-field-present': task({ fieldId: text }, ({ custom_fields: fields }, { fieldId }) => {
        if (!Array.isArray(fields)) return error('ClickUp returned no custom fields.');
        const value = fields.find(({ id }) => id === fieldId)?.value;
        return verdict(
          value != null && value !== '' && (!Array.isArray(value) || value.length > 0),
          `Waiting for custom field "${fieldId}".`
        );
      }),
    },
  };
}

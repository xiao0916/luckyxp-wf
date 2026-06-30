import type { UserConfig } from '@commitlint/cli'

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'style', 'docs', 'test', 'chore', 'perf', 'ci'],
    ],
    'subject-max-length': [2, 'always', 100],
    'subject-case': [0, 'always'],
  },
}

export default Configuration

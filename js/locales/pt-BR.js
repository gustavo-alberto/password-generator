// Brazilian Portuguese UI strings. Keys must match js/locales/en.js (checked by tests/i18n.test.js).
// Plural forms use the suffixes from Intl.PluralRules (_one, _other).

export default Object.freeze({
  // Document
  documentTitle: 'Gerador de senhas',
  metaDescription: 'Gere senhas, frases-senha e PINs seguros direto no seu navegador. Nada é enviado nem armazenado.',

  // Header and navigation
  skipToContent: 'Pular para o conteúdo',
  appName: 'Gerador de senhas',
  language: 'Idioma',
  themeToDark: 'Mudar para o tema escuro',
  themeToLight: 'Mudar para o tema claro',
  modeLabel: 'Modo de geração',
  modeRandom: 'Aleatória',
  modePassphrase: 'Frase',
  modePin: 'PIN',

  // Result
  resultTitle: 'Resultado',
  copy: 'Copiar',
  copied: 'Copiado ✓',
  generate: 'Gerar',
  hide: 'Ocultar',
  show: 'Mostrar',
  privacy: 'Gerada no seu navegador. Nada é enviado.',
  newSecretGenerated: 'Novo resultado gerado',
  copiedAnnouncement: 'Copiado para a área de transferência',
  bulkTitle: 'Gerar várias',
  optionsTitle: 'Opções',

  // Strength and crack time
  strength_poor: 'Ruim',
  strength_weak: 'Fraca',
  strength_good: 'Boa',
  strength_excellent: 'Excelente',
  bits: '{bits} bits',
  crackInstant: 'Quebrada na hora*',
  crackTime: '~{time} para quebrar*',
  crackAssumption: '*a 10 bilhões de tentativas por segundo',
  unitSeconds_one: '{count} segundo',
  unitSeconds_other: '{count} segundos',
  unitMinutes_one: '{count} minuto',
  unitMinutes_other: '{count} minutos',
  unitHours_one: '{count} hora',
  unitHours_other: '{count} horas',
  unitDays_one: '{count} dia',
  unitDays_other: '{count} dias',
  unitYears_one: '{count} ano',
  unitYears_other: '{count} anos',
  unitYearsExponent: '10{exponent} anos',

  // Errors
  errCrypto: 'Seu navegador não oferece números aleatórios seguros, então nada pode ser gerado.',
  errCopy: 'Não foi possível copiar. Selecione e copie manualmente.',
  errNoGroup: 'Escolha pelo menos um grupo de caracteres',
  errTooShort: 'Tamanho menor que o número de grupos',
  errTooManyAttempts: 'Essas opções são restritivas demais. Tente um tamanho maior.',
  errInvalidLength: 'Informe um valor de {min} a {max}',

  // Footer
  footerPrivacy: 'Nenhuma senha é enviada ou armazenada. Tudo acontece no seu navegador.',
  sourceCode: 'Código-fonte',
  license: 'Licença MIT',
})

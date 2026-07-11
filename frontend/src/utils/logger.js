export const logError = (action, err) => {
  const structuredLog = {
    timestamp: new Date().toISOString(),
    severity: 'ERROR',
    module: 'FRONTEND_CLIENT',
    action: action,
    error_message: err?.message || String(err),
    error_stack: err?.stack || null
  };
  
  // Mematuhi standar Enterprise: Hanya menggunakan log terstruktur dalam format JSON
  console.error(JSON.stringify(structuredLog));
};

export const logInfo = (action, details) => {
  const structuredLog = {
    timestamp: new Date().toISOString(),
    severity: 'INFO',
    module: 'FRONTEND_CLIENT',
    action: action,
    details: details
  };
  
  // Mematuhi standar Enterprise: Hanya menggunakan log terstruktur dalam format JSON
  console.info(JSON.stringify(structuredLog));
};

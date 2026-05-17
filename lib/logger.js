export async function logEvent(action, metadata = {}, errorMessage = null, userId = null) {
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        metadata,
        error_message: errorMessage,
        user_id: userId,
      }),
    });
  } catch (e) {
    /* silent */
  }
}

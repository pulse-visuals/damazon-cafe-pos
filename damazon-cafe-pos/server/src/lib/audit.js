async function writeAudit(client, { userId, action, entityType, entityId, details }) {
  await client.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES ($1,$2,$3,$4,$5)`,
    [userId || null, action, entityType || null, entityId || null, details || null]
  );
}

module.exports = { writeAudit };

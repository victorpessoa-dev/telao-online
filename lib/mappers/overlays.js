export function mapOverlayRow(row) {
  const data = row?.data || {};

  return {
    id: row.id,
    publicId: row.public_id || row.id,
    name: row.name,
    width: row.width,
    height: row.height,
    elements: Array.isArray(data.elements) ? data.elements : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildOverlayPayload(overlay) {
  return {
    name: overlay.name,
    width: overlay.width || 1920,
    height: overlay.height || 1080,
    data: {
      elements: overlay.elements || [],
    },
    is_public: true,
  };
}

/**
 * Convert an MCAP ROS 2 schema name (`family/msg/Name`) into the lookup key used
 * by `@heojeongbo/ts-ros2-msgs` codecs (`family/Name`). Service / action schema
 * names (`family/srv/Name`, `family/action/Name`) are returned unchanged so the
 * caller can decide whether to handle them. Names already lacking the `/msg/`
 * segment pass through untouched.
 */
export function normalizeSchemaName(mcapName: string): string {
  return mcapName.replace(/^([^/]+)\/msg\/([^/]+)$/, "$1/$2");
}

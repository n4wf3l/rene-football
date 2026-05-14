import ScoutingShell from '../../components/Scouting/ScoutingShell'

/**
 * Single-route admin page that hosts the full scouting cockpit.
 * All internal navigation happens via URL query params (?view=…&player=…),
 * so back/forward and deep-links work natively.
 */
function AdminScouting() {
  return <ScoutingShell />
}

export default AdminScouting

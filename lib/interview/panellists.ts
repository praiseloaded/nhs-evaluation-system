// lib/interview/panellists.ts

export interface Panellist {
  id: string
  name: string
  role: string
  title: string
  avatar: string  // emoji for MVP, replace with images later
  color: string   // accent color for UI
  specialty: string
  questionStyle: string
}

// The three-panel NHS interview format
export const NHS_PANEL: Panellist[] = [
  {
    id: "clinical",
    name: "Dr. Sarah Okonkwo",
    role: "Clinical Lead",
    title: "Associate Director of Nursing",
    avatar: "👩🏾‍⚕️",
    color: "#2563eb", // blue
    specialty: "Clinical competence, patient safety, evidence-based practice",
    questionStyle: "Probes clinical knowledge, decision-making under pressure, and patient outcomes. Expects STAR examples with measurable results.",
  },
  {
    id: "hr",
    name: "James Mitchell",
    role: "HR Panel Member",
    title: "Recruitment & Workforce Lead",
    avatar: "👨🏻‍💼",
    color: "#7c3aed", // purple
    specialty: "NHS values, equality & diversity, professional conduct, fitness to practise",
    questionStyle: "Focuses on values alignment, teamwork, handling conflict, and professional boundaries. Looks for self-awareness and reflection.",
  },
  {
    id: "operational",
    name: "Amara Osei",
    role: "Service Manager",
    title: "Community Services Operational Lead",
    avatar: "👩🏽‍💻",
    color: "#059669", // green
    specialty: "Caseload management, service improvement, governance, operational delivery",
    questionStyle: "Tests understanding of NHS pressures, resource management, change leadership, and governance. Expects concrete operational examples.",
  },
]

export function getPanellistById(id: string): Panellist | undefined {
  return NHS_PANEL.find(p => p.id === id)
}
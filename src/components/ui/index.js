/**
 * Editorial Crimson primitives.
 *
 * Every migrated page composes these rather than hand-rolling markup. The
 * point of the layer is that a page never writes a raw hex, a radius or a
 * font size — it picks a variant. See docs/superpowers/specs/2026-09-28-
 * editorial-crimson-redesign-design.md §5.5.
 */

export { default as Button } from "./Button";
export { default as Card } from "./Card";
export { default as EmptyState } from "./EmptyState";
export { default as Field } from "./Field";
export { default as Icon, ICON_SIZES } from "./Icon";
export { default as Input } from "./Input";
export { default as Modal, MODAL_SIZES } from "./Modal";
export { default as PageHeader } from "./PageHeader";
export { default as Pill } from "./Pill";
export { default as SectionHeading } from "./SectionHeading";
export { default as Select } from "./Select";
export { default as StatCard } from "./StatCard";
export { default as Table, TableRow, TableCell } from "./Table";
export { default as Textarea } from "./Textarea";

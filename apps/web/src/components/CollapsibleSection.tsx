import { useState, type ReactNode } from 'react';
import { IconChevronDown, IconChevronUp } from '../lib/icons';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultCollapsed?: boolean;
  /** When provided, section is controlled by parent */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children: ReactNode;
  className?: string;
}

export const CollapsibleSection = ({
  title,
  subtitle,
  defaultCollapsed = true,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  children,
  className,
}: CollapsibleSectionProps) => {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isControlled = controlledCollapsed !== undefined;
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed;

  const toggle = () => {
    const next = !collapsed;
    if (isControlled && onCollapsedChange) {
      onCollapsedChange(next);
    } else {
      setInternalCollapsed(next);
    }
  };

  return (
    <div className={`collapsible${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="collapsible-header"
        onClick={toggle}
      >
        <div className="collapsible-title-group">
          <span className="collapsible-title">{title}</span>
          {subtitle && <span className="collapsible-subtitle">{subtitle}</span>}
        </div>
        <span className="collapsible-icon" aria-hidden>
          {collapsed ? (
            <IconChevronDown className="collapsible-icon__svg" />
          ) : (
            <IconChevronUp className="collapsible-icon__svg" />
          )}
        </span>
      </button>
      <div
        className={
          collapsed
            ? 'collapsible-body collapsible-body--hidden'
            : 'collapsible-body'
        }
        aria-hidden={collapsed}
      >
        {children}
      </div>
    </div>
  );
};


import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from './utils';
function Badge({ className, ...props }) {
    return (_jsx("span", { "data-slot": "badge", className: cn('inline-flex items-center rounded-md border border-transparent font-medium', className), ...props }));
}
export { Badge };

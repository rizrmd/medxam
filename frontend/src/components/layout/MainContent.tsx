import type { FC, ReactElement } from "react";
import { css } from "goober";
import { cn } from "@/lib/utils";

export const MainContent: FC<{
  children: ReactElement;
  header?: ReactElement;
}> = ({ header, children }) => {
  return (
    <div className="flex flex-col flex-1 items-stretch">
      {header && <div className="h-[60px] border-b">{header}</div>}
      <div
        className={cn(
          "flex flex-1 overflow-auto p-6",
          css`
            > div {
              flex: 1;
            }
          `
        )}
      >
        {children}
      </div>
    </div>
  );
};

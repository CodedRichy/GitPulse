import React from 'react';
import { Box as InkBox } from 'ink';

interface GridProps {
  columns: number;
  children: React.ReactNode[];
  gap?: number;
  marginTop?: number;
  marginBottom?: number;
}

export const Grid: React.FC<GridProps> = ({ 
  columns, 
  children, 
  gap = 3,
  marginTop = 0,
  marginBottom = 0
}) => {
  const rows = Math.ceil(children.length / columns);
  
  return (
    <InkBox 
      flexDirection="column"
      marginTop={marginTop}
      marginBottom={marginBottom}
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <InkBox key={rowIndex} flexDirection="row" gap={gap}>
          {children
            .slice(rowIndex * columns, (rowIndex + 1) * columns)
            .map((child, colIndex) => (
              <InkBox key={colIndex}>{child}</InkBox>
            ))}
        </InkBox>
      ))}
    </InkBox>
  );
};

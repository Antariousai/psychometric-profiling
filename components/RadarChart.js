import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { T } from '../constants/tokens';

export default function RadarChart({ dimScores, size = 260 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.346;
  const n = dimScores.length;

  const points = dimScores.map((d, i) => {
    const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const rr = r * (d.pct / 100);
    return {
      x: cx + Math.cos(angle) * rr,
      y: cy + Math.sin(angle) * rr,
      d,
      angle,
    };
  });
  const polygon = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {[0.25, 0.5, 0.75, 1].map(f => (
          <Circle
            key={f}
            cx={cx}
            cy={cy}
            r={r * f}
            fill="none"
            stroke={T.border}
            strokeWidth={1}
            strokeDasharray={f === 1 ? undefined : '2,3'}
          />
        ))}
        {dimScores.map((d, i) => {
          const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
          const lx = cx + Math.cos(angle) * (r + 22);
          const ly = cy + Math.sin(angle) * (r + 22);
          const lx2 = cx + Math.cos(angle) * r;
          const ly2 = cy + Math.sin(angle) * r;
          return (
            <React.Fragment key={d.id}>
              <Line x1={cx} y1={cy} x2={lx2} y2={ly2} stroke={T.border} strokeWidth={1} />
              <SvgText
                x={lx}
                y={ly}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontFamily={T.fBnBold}
                fontSize={10}
                fill={d.color}
              >
                {d.bn.split(' ')[0]}
              </SvgText>
            </React.Fragment>
          );
        })}
        <Polygon
          points={polygon}
          fill="rgba(46,196,182,0.2)"
          stroke={T.teal}
          strokeWidth={2}
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={p.d.color} stroke="#fff" strokeWidth={2} />
        ))}
      </Svg>
    </View>
  );
}

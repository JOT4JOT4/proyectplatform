export interface TimeSlot {
  name: string;
  startTime: string;
  endTime: string;
}

export const BASE_BLOCKS: TimeSlot[] = [
  { name: 'Bloque A', startTime: '08:10', endTime: '09:40' },
  { name: 'Bloque B', startTime: '09:55', endTime: '11:25' },
  { name: 'Bloque C', startTime: '11:40', endTime: '13:10' },
  { name: 'Bloque C2', startTime: '13:10', endTime: '14:30' },
  { name: 'Bloque D', startTime: '14:30', endTime: '16:00' },
  { name: 'Bloque E', startTime: '16:15', endTime: '17:45' },
  { name: 'Bloque F', startTime: '18:00', endTime: '19:30' },
];

export function getDividedBlocks(divisions: number): TimeSlot[] {
  if (divisions <= 1) return BASE_BLOCKS;
  
  const slots: TimeSlot[] = [];
  
  for (const base of BASE_BLOCKS) {
    const [startH, startM] = base.startTime.split(':').map(Number);
    const [endH, endM] = base.endTime.split(':').map(Number);
    
    const startTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;
    const totalDuration = endTotalMinutes - startTotalMinutes; // 90 min
    
    const slotDuration = Math.floor(totalDuration / divisions);
    
    for (let i = 0; i < divisions; i++) {
      const slotStartTotal = startTotalMinutes + i * slotDuration;
      const slotEndTotal = slotStartTotal + slotDuration;
      
      const formatTime = (totalMin: number) => {
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };
      
      slots.push({
        name: `${base.name} - Sub ${i + 1}`,
        startTime: formatTime(slotStartTotal),
        endTime: formatTime(slotEndTotal),
      });
    }
  }
  
  return slots;
}

import { GoalItemProgress } from '../components/dashboard/GoalDonutCharts';

interface ShareSummary {
  daily: { items: GoalItemProgress[]; averagePct: number };
  weekly: { items: GoalItemProgress[]; averagePct: number };
  monthly: { items: GoalItemProgress[]; averagePct: number };
}

// Render a branded goal summary card to canvas and share via Web Share API
export const shareGoalSummaryCard = async (summary: ShareSummary) => {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Background ──
  ctx.fillStyle = '#F5F1E8';
  ctx.fillRect(0, 0, W, H);

  // Subtle border
  ctx.strokeStyle = '#D4C9B8';
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, W - 64, H - 64);

  // ── Header ──
  ctx.fillStyle = '#0F4C45';
  ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('notare', W / 2, 110);

  ctx.fillStyle = '#8A7B6B';
  ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Goal Progress Summary', W / 2, 160);

  // Divider
  ctx.strokeStyle = '#C8B9A5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, 195);
  ctx.lineTo(W - 100, 195);
  ctx.stroke();

  // ── Donut sections ──
  const sections = [
    { label: 'Daily', data: summary.daily, color: '#0EA5E9' },
    { label: 'Weekly', data: summary.weekly, color: '#10B981' },
    { label: 'Monthly', data: summary.monthly, color: '#F59E0B' },
  ].filter(s => s.data.items.length > 0);

  if (sections.length === 0) {
    ctx.fillStyle = '#8A7B6B';
    ctx.font = '36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('No goals set yet!', W / 2, H / 2);
  } else {
    // Layout: rings side by side, then goal list below
    const ringY = 340;
    const ringRadius = sections.length === 1 ? 120 : sections.length === 2 ? 100 : 85;
    const ringSpacing = W / (sections.length + 1);

    sections.forEach((section, i) => {
      const cx = ringSpacing * (i + 1);
      const cy = ringY;
      const pct = section.data.averagePct;

      // Background ring
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#D4C9B8';
      ctx.lineWidth = 24;
      ctx.stroke();

      // Progress ring
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * pct) / 100;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, startAngle, endAngle);
      ctx.strokeStyle = section.color;
      ctx.lineWidth = 24;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';

      // Percentage text
      ctx.fillStyle = '#1E293B';
      ctx.font = `bold ${sections.length === 1 ? 64 : 48}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${pct}%`, cx, cy);

      // Label below ring
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(section.label, cx, cy + ringRadius + 50);

      // Completed count
      const completed = section.data.items.filter(item => item.isCompleted).length;
      ctx.fillStyle = '#8A7B6B';
      ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(`${completed}/${section.data.items.length} done`, cx, cy + ringRadius + 82);
    });

    // ── Goal detail list ──
    let listY = ringY + ringRadius + 140;

    // Divider
    ctx.strokeStyle = '#C8B9A5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, listY - 20);
    ctx.lineTo(W - 100, listY - 20);
    ctx.stroke();

    const allItems = sections.flatMap(s =>
      s.data.items.map(item => ({ ...item, sectionColor: s.color, sectionLabel: s.label }))
    );

    // Sort: completed first, then by pct descending
    allItems.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? -1 : 1;
      return b.completionPct - a.completionPct;
    });

    // Show up to 8 goals
    const displayItems = allItems.slice(0, 8);
    const rowHeight = 72;

    displayItems.forEach((item, i) => {
      const y = listY + i * rowHeight;

      // Progress bar background
      const barX = 100;
      const barW = W - 200;
      const barH = 28;

      ctx.fillStyle = '#E8DFD3';
      roundRect(ctx, barX, y + 28, barW, barH, 14);
      ctx.fill();

      // Progress bar fill
      const fillW = Math.min(barW, (barW * item.completionPct) / 100);
      if (fillW > 0) {
        ctx.fillStyle = item.isCompleted ? '#10B981' : item.sectionColor;
        roundRect(ctx, barX, y + 28, fillW, barH, 14);
        ctx.fill();
      }

      // Goal name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(item.subcategory?.name || 'Goal', barX, y + 20);

      // Percentage + status
      ctx.textAlign = 'right';
      ctx.fillStyle = item.isCompleted ? '#10B981' : '#64748B';
      ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const statusText = item.isCompleted ? `✓ ${item.completionPct}%` : `${item.completionPct}%`;
      ctx.fillText(statusText, barX + barW, y + 20);

      // Logged vs target (small text under bar)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8A7B6B';
      ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const unit = item.goal.target_type === 'time' ? 'min' : 'x';
      const freq = item.goal.frequency === 'daily' ? 'today' : item.goal.frequency === 'weekly' ? 'this week' : 'this month';
      ctx.fillText(`${item.loggedValue}/${item.targetValue} ${unit} ${freq}`, barX, y + 68);
    });

    if (allItems.length > 8) {
      const moreY = listY + displayItems.length * rowHeight + 10;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8A7B6B';
      ctx.font = 'italic 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(`+ ${allItems.length - 8} more goals`, W / 2, moreY);
    }
  }

  // ── Footer ──
  // Date range
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8A7B6B';
  ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  ctx.fillText(dateStr, W / 2, H - 100);

  // Brand footer
  ctx.fillStyle = '#0F4C45';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('notare  •  track what matters', W / 2, H - 60);

  // ── Share or Download ──
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/png')
  );

  const file = new File([blob], `notare-goals-${now.toISOString().slice(0, 10)}.png`, {
    type: 'image/png',
  });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'My Notare Goal Progress',
        text: 'Check out my goal progress on Notare!',
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share failed, falling back to download:', err);
        downloadBlob(blob, file.name);
      }
    }
  } else {
    downloadBlob(blob, file.name);
  }
};

// ── Helpers ──

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Resilient Export Queue & State Machine (Staff / Senior Grade)
 * Orquestra jobs de renderização pesada em chunks para evitar Out-of-Memory (OOM)
 * com máquina de estados finitos, cancelamento limpo e telemetria de progresso.
 */

export type ExportJobStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ExportJob {
  id: string;
  name: string;
  totalFrames: number;
  processedFrames: number;
  status: ExportJobStatus;
  progressPercent: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export type ExportQueueListener = (job: ExportJob) => void;

export class ExportQueueManager {
  private currentJob: ExportJob | null = null;
  private listeners: Set<ExportQueueListener> = new Set();
  private isAborted = false;

  public subscribe(listener: ExportQueueListener): () => void {
    this.listeners.add(listener);
    if (this.currentJob) {
      listener(this.currentJob);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    if (this.currentJob) {
      for (const listener of this.listeners) {
        listener({ ...this.currentJob });
      }
    }
  }

  public createJob(name: string, totalFrames: number): ExportJob {
    this.isAborted = false;
    this.currentJob = {
      id: `export_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      totalFrames: Math.max(1, totalFrames),
      processedFrames: 0,
      status: 'queued',
      progressPercent: 0,
      createdAt: new Date().toISOString()
    };
    this.notify();
    return this.currentJob;
  }

  public startJob(): boolean {
    if (!this.currentJob || this.currentJob.status !== 'queued') return false;
    this.currentJob.status = 'processing';
    this.notify();
    return true;
  }

  public updateFrame(currentFrame: number): void {
    if (!this.currentJob || this.currentJob.status !== 'processing') return;
    if (this.isAborted) return;

    this.currentJob.processedFrames = Math.min(this.currentJob.totalFrames, currentFrame);
    this.currentJob.progressPercent = Math.min(
      100,
      Math.round((this.currentJob.processedFrames / this.currentJob.totalFrames) * 100)
    );
    this.notify();
  }

  public completeJob(): void {
    if (!this.currentJob) return;
    this.currentJob.status = 'completed';
    this.currentJob.progressPercent = 100;
    this.currentJob.completedAt = new Date().toISOString();
    this.notify();
  }

  public failJob(error: string): void {
    if (!this.currentJob) return;
    this.currentJob.status = 'failed';
    this.currentJob.errorMessage = error;
    this.notify();
  }

  public cancelJob(): void {
    if (!this.currentJob) return;
    this.isAborted = true;
    this.currentJob.status = 'cancelled';
    this.notify();
  }

  public isCancelled(): boolean {
    return this.isAborted;
  }

  public getJob(): ExportJob | null {
    return this.currentJob;
  }
}

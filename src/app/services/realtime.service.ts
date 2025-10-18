import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

export interface StockData {
  code: string;
  date?: string;
  open?: number;
  close?: number;
  high?: number;
  low?: number;
  volume?: number;
  price?: number;
  change?: number;
  pctChange?: number;
  time?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RealtimeService {
  private apiUrl = 'http://localhost:3000/api/stocks';
  private wsUrl = 'ws://localhost:3000';
  private socket?: WebSocket;
  private stocks$ = new BehaviorSubject<StockData[]>([]);
  private symbols: string[] = [];

  constructor(private http: HttpClient, private zone: NgZone) {}

  /** Gọi REST API lấy dữ liệu lịch sử */
  fetchHistory(symbols: string[]): Observable<any> {
    const query = symbols.join(',');
    return this.http.get(`${this.apiUrl}?symbols=${query}`);
  }

  /** Kết nối WebSocket realtime */
  connect(symbols: string[]) {
    this.symbols = symbols;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

    this.socket = new WebSocket(this.wsUrl);

    this.socket.onopen = () => {
      console.log('[WS] Connected');
      const msg = { action: 'subscribe', symbols };
      this.socket?.send(JSON.stringify(msg));
    };

    this.socket.onmessage = (event) => {
      this.zone.run(() => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'tick' && msg.data) {
            this.updateStock(msg.data);
          }
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      });
    };

    this.socket.onclose = () => {
      console.warn('[WS] Disconnected — reconnecting in 5s...');
      setTimeout(() => this.connect(this.symbols), 5000);
    };

    this.socket.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }

  /** Cập nhật giá realtime vào danh sách */
  private updateStock(tick: any) {
    const stocks = [...this.stocks$.value];
    const index = stocks.findIndex((s) => s.code === tick.code);
    if (index >= 0) {
      stocks[index] = { ...stocks[index], ...tick };
    } else {
      stocks.push(tick);
    }
    this.stocks$.next(stocks);
  }

  /** Observable để component subscribe */
  getRealtimeData(): Observable<StockData[]> {
    return this.stocks$.asObservable();
  }

  /** Ngắt kết nối */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
  }
}

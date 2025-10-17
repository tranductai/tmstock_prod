import { Component } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { SupabaseService } from '../../../services/supabase.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DigitAddCommasDirective } from '../../../shared/digit-add-commas.directive';
import { EditOrderComponent } from '../../../shared/common/edit-order/edit-order.component';
import { RealtimeService, StockData } from '../../../services/realtime.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-trading',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatDialogModule],
  providers: [DatePipe],
  templateUrl: './trading.component.html',
  styleUrl: './trading.component.css'
})
export class TradingComponent {
  issuedDate: string | null = null;
  orders: any[] = [];
  summary: any[] = [];
  orderBody: { [key: string]: string } = {
    "stock_code": '',
    "order_type": 'BUY',
    "quantity": '',
    "price_buy": '',
    "price_sell": '',
    "total_amount": '',
    "created_at": '',
    "description": ''
  }
  isAdd: boolean = false;
  isOrderList: boolean = true;
  isSummary: boolean = false;
  subscription: any;
  // private sub!: Subscription;
  subscriptions: any;
  userProfile: any;
  summaryList: any = [];
  stockPrevious: any[] = []
  stocks: any[] = [];
  sub?: Subscription;
  listStockCodeSummary = ['VND', 'HPG', 'NKG'];

  constructor(private sb: SupabaseService, private router: Router, public dialog: MatDialog, private datePipe: DatePipe, private realtime: RealtimeService) { }

  async ngOnInit() {
    this.userProfile = JSON.parse(localStorage.getItem('user') || 'null');
    await this.getOrders();
    await this.getSummary();
    //////////////

    // Bắt đầu kết nối WS
    this.realtime.connect(this.listStockCodeSummary);

    // Lấy dữ liệu lịch sử ban đầu
    this.refresh();
    setInterval(() => {
      this.refresh(); // lấy lại DChart API mỗi 5s
    }, 5000);

    // Subscribe realtime updates
    this.sub = this.realtime.getRealtimeData().subscribe((data) => {
      if (data) this.stocks = data;
    });
    //////////////

    ///ORDER REALTIME
    this.subscription = this.sb.listenOrders(async (payload) => {
      if (payload.eventType === 'INSERT') {
        this.orders.unshift(payload.new);
        ////
        this.summaryList = this.summary.filter(
          (data) => data.stock_code == payload.new.stock_code
        );
        if (payload.new.order_type == 'BUY') {
          if (this.summaryList.length == 0) {
            const totalBuyAmount = parseInt(payload.new['price_buy']) * payload.new['quantity']
            const newOrder = await this.sb.addCall({
              stock_code: payload.new['stock_code'],
              average_price: payload.new['price_buy'],
              total_buy_quantity: payload.new['quantity'],
              total_buy_amount: totalBuyAmount,
              total_sell_quantity: 0,
              total_sell_amount: 0
            }, 'summary')
          } else {
            if (this.summaryList[0]['stock_code'] == payload.new['stock_code']) {
              const totalBuyQuantity = this.summaryList[0]['total_buy_quantity'] + payload.new['quantity'];
              const totalBuyAmount = this.summaryList[0]['total_buy_amount'] + payload.new['total_amount'];
              await this.updateSummary(totalBuyQuantity, totalBuyAmount);
              // let edited = await this.sb.updateCall(this.summaryList[0].id, {
              //   average_price: totalBuyAmount / totalBuyQuantity,
              //   total_buy_quantity: totalBuyQuantity,
              //   total_buy_amount: totalBuyAmount,
              //   total_sell_quantity: 0,
              //   total_sell_amount: 0
              // }, 'summary');

            }
          }
        } else if (payload.new.order_type == 'SELL') {
          if (this.summaryList[0]['stock_code'] == payload.new['stock_code']) {
            const totalBuyQuantity = this.summaryList[0]['total_buy_quantity'] - payload.new['quantity'];
            const totalBuyAmount = payload.new['quantity'] * this.summaryList[0]['average_price'];
            // const totalBuyAmount = this.summaryList[0]['total_buy_amount'] - payload.new['total_amount'];
            await this.updateSummary(totalBuyQuantity, totalBuyAmount);
            // let edited = await this.sb.updateCall(this.summaryList[0].id, {
            //   average_price: totalBuyAmount / totalBuyQuantity,
            //   total_buy_quantity: totalBuyQuantity,
            //   total_buy_amount: totalBuyAmount,
            //   total_sell_quantity: 0,
            //   total_sell_amount: 0
            // }, 'summary');
          }
        }
        ///
      }
      if (payload.eventType === 'UPDATE') {
        const index = this.orders.findIndex(o => o.id === payload.new.id);
        if (index !== -1) this.orders[index] = payload.new;
        this.summaryList = this.summary.filter(
          (data) => data.stock_code == payload.new.stock_code
        );
        if (payload.new.order_type == 'BUY') {
          if (this.sb.bodyUpdateSummary) {
            const totalBuyQuantity = this.summaryList[0]['total_buy_quantity'] + this.sb.bodyUpdateSummary['updated_buy_quantity'];
            const totalBuyAmount = this.summaryList[0]['total_buy_amount'] + this.sb.bodyUpdateSummary['updated_buy_amount'];
            await this.updateSummary(totalBuyQuantity, totalBuyAmount);
            // let edited = await this.sb.updateCall(this.summaryList[0].id, {
            //   average_price: totalBuyAmount / totalBuyQuantity,
            //   total_buy_quantity: totalBuyQuantity,
            //   total_buy_amount: totalBuyAmount,
            //   total_sell_quantity: 0,
            //   total_sell_amount: 0
            // }, 'summary');
          }
        }
      }
      if (payload.eventType === 'DELETE') {
        this.orders = this.orders.filter(o => o.id !== payload.old.id);
        this.summaryList = this.summary.filter(
          (data) => data.stock_code == payload.new.stock_code
        );
        if (payload.new.order_type == 'BUY') {
          if (this.summaryList[0]['stock_code'] == payload.new['stock_code']) {
            const totalBuyQuantity = this.summaryList[0]['total_buy_quantity'] - payload.new['quantity'];
            const totalBuyAmount = this.summaryList[0]['total_buy_amount'] - payload.new['total_amount'];
            await this.updateSummary(totalBuyQuantity, totalBuyAmount);
            // let edited = await this.sb.updateCall(this.summaryList[0].id, {
            //   average_price: totalBuyAmount / totalBuyQuantity,
            //   total_buy_quantity: totalBuyQuantity,
            //   total_buy_amount: totalBuyAmount,
            //   total_sell_quantity: 0,
            //   total_sell_amount: 0
            // }, 'summary');
          }
        } else if (payload.new.order_type == 'BUY') {
          const totalBuyQuantity = this.summaryList[0]['total_buy_quantity'] + payload.new['quantity'] * 2;
          const totalBuyAmount = this.summaryList[0]['total_buy_amount'] + payload.new['total_amount'] * 2;
          await this.updateSummary(totalBuyQuantity, totalBuyAmount);
          // let edited = await this.sb.updateCall(this.summaryList[0].id, {
          //   average_price: totalBuyAmount / totalBuyQuantity,
          //   total_buy_quantity: totalBuyQuantity,
          //   total_buy_amount: totalBuyAmount,
          //   total_sell_quantity: 0,
          //   total_sell_amount: 0
          // }, 'summary');
        }
      }
    });
    ///SUMMARY REALTIME
    this.subscriptions = this.sb.listenSummary(async (payload) => {
      if (payload.eventType === 'INSERT') {
        this.summary.unshift(payload.new);
        this.summary.forEach(item => {
          if (item.stock_code != '' && !this.summary.includes(payload.new['stock_code'])) this.listStockCodeSummary.push(item.stock_code);
        })
      }
      if (payload.eventType === 'UPDATE') {
        const index = this.summary.findIndex(o => o.id === payload.new.id);
        if (index !== -1) this.summary[index] = payload.new;
      }
      if (payload.eventType === 'DELETE') {
        this.summary = this.summary.filter(o => o.id !== payload.old.id);
      }
    });
  }

  ////GET REALTIME STOCK PRICE WEBSOCKET
  refresh() {
    this.realtime.fetchHistory(this.listStockCodeSummary).subscribe((res) => {
      if (res?.data) {
        const data = Object.values(res.data) as StockData[];
        this.stocks = data;
        if (this.stockPrevious.length <= 0) {
          this.stockPrevious = this.stocks;
          console.log('thissssss', this.stockPrevious)
        }
        console.log('dataaaaaaaaaaaaaaaaaa', this.stocks)
      }
    });
  }
  /////

  ngOnDestroy() {
    if (this.subscription) this.sb.removeChannel(this.subscription);
    if (this.subscriptions) this.sb.removeChannel(this.subscriptions);
    this.sub?.unsubscribe();
    this.realtime.disconnect();
  }

  async getOrders() {
    const { data } = await this.sb.getOrders();
    this.orders = data ?? [];
  }

  async getSummary() {
    this.listStockCodeSummary = [];
    const { data } = await this.sb.getSummary();
    this.summary = data ?? [];
    this.summary.forEach(item => {
      if (item.stock_code != '') this.listStockCodeSummary.push(item.stock_code);
    })
    // this.sb.listenOrders((payload) => {
    //   if (payload.eventType === 'INSERT') {
    //     this.summary.unshift(payload.new);
    //   }
    // });
  }

  async addCall(table: string) {
    const newOrder = await this.sb.addCall({
      stock_code: this.orderBody['stock_code'],
      order_type: this.orderBody['order_type'],
      quantity: parseInt(this.orderBody['quantity']),
      price_buy: this.orderBody['order_type'] == 'SELL' ? this.populateAveragePriceOrder() : parseInt(this.orderBody['price_buy']),
      price_sell: parseInt(this.orderBody['price_sell']),
      total_amount: this.orderBody['order_type'] == 'BUY' ? parseInt(this.orderBody['price_buy']) * parseInt(this.orderBody['quantity']) :
        this.orderBody['order_type'] == 'SELL' ? parseInt(this.orderBody['price_sell']) * parseInt(this.orderBody['quantity']) : 0,
      created_at: this.orderBody['created_at'],
      description: this.orderBody['description']
    }, table);
    if (newOrder) {
      Object.keys(this.orderBody).forEach(key => {
        if (key != 'order_type') {
          this.orderBody[key] = ''
        } else {
          this.orderBody[key] = 'BUY'
        }
      });
      this.isAdd = false;
    }
  }

  async updateSummary(totalBuyQuantity: any, totalBuyAmount: any) {
    let edited = await this.sb.updateCall(this.summaryList[0].id, {
      average_price: totalBuyAmount / totalBuyQuantity,
      total_buy_quantity: totalBuyQuantity,
      total_buy_amount: totalBuyAmount,
      total_sell_quantity: 0,
      total_sell_amount: 0
    }, 'summary');
  }

  addNewSummary() {

  }

  async deleteCall(id: string, table: string) {
    if (confirm('Bạn có chắc muốn xoá lệnh này không?')) {
      await this.sb.deleteCall(id, table);
      this.orders = this.orders.filter(o => o.id !== id);
    }
  }

  //SHOW AVERAGE PRICE
  showAveragePrice(item: any) {
    for (let i = 0; i < this.stocks.length; i++) {
      if (this.stocks[i].code == item.stock_code) return this.stocks[i].close*1000
    }
    return 0
  }
  // PROFITS/LOST
  calculateProfitLost(item: any) {
    for (let i = 0; i < this.stocks.length; i++) {
      if (this.stocks[i].code == item.stock_code) return this.stocks[i].close * 1000 * parseInt(item['total_buy_quantity']) - parseInt(item['total_buy_amount'])
    }
    return 0
  }

  totalProfitsLost(){
    let total = 0
    this.stocks.forEach(stock=>{
      this.summary.forEach(summa=>{
        if(stock.code == summa.stock_code) total += stock.close * 1000 * parseInt(summa['total_buy_quantity']) - parseInt(summa['total_buy_amount'])
      })
    })
    return total;
  }

  openPopup(order: any): void {
    const dialogRef = this.dialog.open(EditOrderComponent, {
      width: "58%", // Optional: set width
      maxWidth: '100%',
      height: "auto",
      data: { item: order } // Optional: pass data to the popup
    });

    dialogRef.afterClosed().subscribe(async result => {
      await this.getOrders();
    });
  }

  parseAndFormat(value: string): number {
    // Remove any non-numeric characters except for the decimal point
    const parsedValue = parseFloat(value.replace(/[^0-9.]/g, ''));
    // Ensure it's a valid number, otherwise default to 0 or handle as needed
    console.log('parsedValue', parsedValue)
    return isNaN(parsedValue) ? 0 : parsedValue;
  }

  parseInt(item: any) {
    return parseInt(item)
  }

  totalAmount() {
    let totalAmount = 0;
    if (this.orderBody['quantity'] != '') {
      totalAmount = this.orderBody['price_buy'] != '' ? parseInt(this.orderBody['price_buy']) * parseInt(this.orderBody['quantity']) :
        this.orderBody['price_sell'] != '' ? parseInt(this.orderBody['price_sell']) * parseInt(this.orderBody['quantity']) : 0
      this.orderBody['total_amount'] = totalAmount.toString();
    }
    return totalAmount;
  }

  populateAveragePriceOrder() {
    let averagePrice = 0;
    if (this.orderBody['stock_code'] != '' && this.orderBody['order_type'] != '') {
      this.summary.forEach(element => {
        if (element.stock_code == this.orderBody['stock_code']) {
          averagePrice = element.average_price;
        }
      });
    }
    return averagePrice
  }

  onChangeValue(event: any, fieldName: any) {
    if (event) {
      if (fieldName == 'order_type' && this.orderBody[fieldName] != event) {
        Object.keys(this.orderBody).forEach(key => {
          if (key != 'order_type') {
            this.orderBody[key] = ''
          } else {
            this.orderBody[key] = 'BUY'
          }
        });
      }
      const value = event.target.value;
      this.orderBody[fieldName] = value;
      // if (fieldName == 'created_at') {
      //   this.issuedDate = this.datePipe.transform(this.orderBody[fieldName], 'dd/MM/yyyy');
      // }
    }
  }

  onAddNewOrder() {
    this.isAdd = true;
  }

  onChangeTab(event: any) {
    switch (event) {
      case 'orderList':
        this.isOrderList = true;
        this.isSummary = false;
        break;
      case 'summary':
        this.isSummary = true;
        this.isOrderList = false;
        break;
      default:
        this.isOrderList = true;
        break;
    }
  }

  onClose() {
    Object.keys(this.orderBody).forEach(key => {
      if (key != 'order_type') {
        this.orderBody[key] = ''
      } else {
        this.orderBody[key] = 'BUY'
      }
    });
    this.isAdd = false
  }
  checkColorPriceUpDown(item: any) {
    if (item['close'] - item['reference'] > 0) {
      return 'price-up'
    } else if (item['close'] - item['reference'] < 0) {
      return 'price-down'
    } else {
      return 'price-noChange'
    }
  }

  animationUpDown(item: any) {
    for (let i = 0; i < this.stockPrevious.length; i++) {
      if (item['code'] == this.stockPrevious[i]['code']) {
        if (item['close'] > this.stockPrevious[i]['close']) {
          console.log('111', item.code)
          this.stockPrevious[i]['close'] = item['close'];
          return ' price-up-animate'
        } else
          if (item['close'] < this.stockPrevious[i]['close']) {
            console.log('22', item.code)
            this.stockPrevious[i]['close'] = item['close'];
            return ' price-down-animate'
          }else{
            return ''
          }
        // if (item['close'] == this.stockPrevious[i]['close']) {
        //   console.log('33')
        //   return ' price-nochange-animate'
        // }
      }
    }
    return ''
  }
}
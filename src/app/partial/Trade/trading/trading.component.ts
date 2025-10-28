import { Component, OnDestroy, OnInit } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { SupabaseService } from '../../../services/supabase.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DigitAddCommasDirective } from '../../../shared/digit-add-commas.directive';
import { EditOrderComponent } from '../../../shared/common/edit-order/edit-order.component';
import { RealtimeService, StockData } from '../../../services/realtime.service';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-trading',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatDialogModule, MatPaginatorModule],
  providers: [DatePipe],
  templateUrl: './trading.component.html',
  styleUrl: './trading.component.css'
})
export class TradingComponent implements OnInit, OnDestroy {
  issuedDate: string | null = null;
  orders: any[] = [];
  portfolio: any[] = [];
  delete_order: any;
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
  cashBody: { [key: string]: string } = {
    "type": 'DEPOSIT',
    "total_amount": '',
    "created_at": '',
    "status": ''
  }
  isAdd: boolean = false;
  isAddCash: boolean = false;
  isOrderList: boolean = true;
  isportfolio: boolean = false;
  isDeleteAllOrders: boolean = false;
  subscription: any;
  subscriptions: any;
  subscriptionses: any;
  subscriptionSummary: any;
  userProfile: any;
  portfolioList: any = [];
  stockPrevious: any[] = []
  stocks: any[] = [];
  cashFlow: any[] = [];
  cashIn: any[] = [];
  cashOut: any[] = [];
  summaries: any[] = [];
  sub?: Subscription;
  private refreshInterval: any;
  errorCount = 0;
  private readonly MAX_ERRORS = 5;
  listStockCodePortfolio: any[] = [];
  currentStep = 0;
  pageSize = 5;
  page = 1;
  totalRecords = 0;
  listmenu = [
    {
      label: 'Order List',
      iconSrc: 'assets/images/icons8-google.svg',
      path: 'orderList',
      valid: false,
    },
    {
      label: 'Portfolio',
      iconSrc: 'assets/images/icons8-google.svg',
      path: 'portfolio',
      valid: false,
    },
    {
      label: 'Cash Flow',
      iconSrc: 'assets/images/icons8-google.svg',
      path: 'cashFlow',
      valid: false,
    }
  ]
  isShowOption = this.listmenu[0].path;
  constructor(private sb: SupabaseService, private router: Router, public dialog: MatDialog, private datePipe: DatePipe, private realtime: RealtimeService) { }

  async ngOnInit() {
    this.userProfile = JSON.parse(localStorage.getItem('user') || 'null');
    await this.getOrders();
    await this.getPortfolio();
    await this.getCashFlow();
    await this.getSummaries()
    //////////////

    // Bắt đầu kết nối WS: START
    // this.realtime.connect(this.listStockCodePortfolio);
    // Subscribe realtime updates
    // this.sub = this.realtime.getRealtimeData().subscribe((data) => {
    //   if (data) this.stocks = data;
    // });
    // Bắt đầu kết nối WS: END

    // Lấy dữ liệu lịch sử ban đầu
    this.refresh();
    this.refreshInterval = setInterval(() => {
      if(this.listStockCodePortfolio.length > 0){
        this.refresh(); // lấy lại DChart API mỗi 5s
      }
    }, 5000);
    //////////////

    ///ORDER REALTIME
    this.subscription = this.sb.listenOrders(async (payload) => {
      if (payload.eventType === 'INSERT') {
        this.orders.unshift(payload.new);
        this.portfolioList = this.portfolio.filter(
          (data) => data.stock_code == payload.new.stock_code
        );
        if (payload.new.order_type == 'BUY') {
          if (this.portfolioList.length == 0) {
            const totalBuyAmount = parseInt(payload.new['price_buy']) * payload.new['quantity']
            const newOrder = await this.sb.addCall({
              stock_code: payload.new['stock_code'],
              average_price: payload.new['price_buy'],
              total_buy_quantity: payload.new['quantity'],
              total_buy_amount: totalBuyAmount,
              total_sell_quantity: 0,
              total_sell_amount: 0
            }, 'portfolio')
          } else {
            const total_Quantity = this.portfolioList[0]['total_buy_quantity'] + payload.new['quantity'];
            const total_Amount = this.portfolioList[0]['total_buy_amount'] + payload.new['total_amount'];
            await this.updatePortfolio(total_Quantity, total_Amount, 'BUY');
          }
        } else if (payload.new.order_type == 'SELL') {
          const total_Quantity = this.portfolioList[0]['total_sell_quantity'] + payload.new['quantity'];
          const total_Amount = this.portfolioList[0]['total_sell_amount'] + this.portfolioList[0]['average_price'] * payload.new['quantity'];
          await this.updatePortfolio(total_Quantity, total_Amount, 'SELL');
        }
      }
      if (payload.eventType === 'UPDATE') {
        const index = this.orders.findIndex(o => o.id === payload.new.id);
        if (index !== -1) this.orders[index] = payload.new;
        this.portfolioList = this.portfolio.filter(
          (data) => data.stock_code == payload.new.stock_code
        );
        if (this.portfolioList.length == 1) {
          if (payload.new.order_type == 'BUY') {
            if (this.sb.bodyUpdatePortfolio) {
              const total_Quantity = this.portfolioList[0]['total_buy_quantity'] + this.sb.bodyUpdatePortfolio['updated_buy_quantity'];
              const total_Amount = this.portfolioList[0]['total_buy_amount'] + this.sb.bodyUpdatePortfolio['updated_buy_amount'];
              await this.updatePortfolio(total_Quantity, total_Amount, 'BUY');
            }
          } else if (payload.new.order_type == 'SELL') {
            const totalBuyQuantity = this.portfolioList[0]['total_sell_quantity'] + this.sb.bodyUpdatePortfolio['updated_sell_quantity'];
            const totalBuyAmount = this.portfolioList[0]['total_sell_amount'] + this.sb.bodyUpdatePortfolio['updated_sell_amount'];
            await this.updatePortfolio(totalBuyQuantity, totalBuyAmount, 'SELL');
          }
        }
      }
      if (payload.eventType === 'DELETE') {
        this.orders = this.orders.filter(o => o.id !== payload.old.id);
        this.portfolioList = this.portfolio.filter(
          (data) => data.stock_code == this.delete_order.stock_code
        );
        if (!this.isDeleteAllOrders) {
          const isRemovePortfolio = await this.deletePortfolio(this.delete_order, 'portfolio');
          if (this.delete_order.order_type == 'BUY' && !isRemovePortfolio) {
            if (this.portfolioList[0]['stock_code'] == this.delete_order['stock_code']) {
              const total_Quantity = this.portfolioList[0]['total_buy_quantity'] - this.delete_order['quantity'];
              const total_Amount = this.portfolioList[0]['total_buy_amount'] - this.delete_order['total_amount'];
              await this.updatePortfolio(total_Quantity, total_Amount, 'BUY');
            }
          } else if (this.delete_order.order_type == 'SELL') {
            const total_Quantity = this.portfolioList[0]['total_sell_quantity'] - this.delete_order['quantity'];
            const total_Amount = this.portfolioList[0]['total_sell_amount'] - this.portfolioList[0]['average_price'] * this.delete_order['quantity'];
            await this.updatePortfolio(total_Quantity, total_Amount, 'SELL');
          }
        }
      }
    });
    ///portfolio REALTIME
    this.subscriptions = this.sb.listenPortfolio(async (payload) => {
      if (payload.eventType === 'INSERT') {
        this.portfolio.unshift(payload.new);
        this.portfolio.forEach(item => {
          if (item.stock_code == payload.new['stock_code'] && !this.portfolio.includes(payload.new['stock_code'])) this.listStockCodePortfolio.push(item.stock_code);
        })
      }
      if (payload.eventType === 'UPDATE') {
        const index = this.portfolio.findIndex(o => o.id === payload.new.id);
        if (index !== -1) this.portfolio[index] = payload.new;
        if (this.portfolio[index]['total_buy_quantity'] == this.portfolio[index]['total_sell_quantity']) {
          this.isDeleteAllOrders = true;
          await this.sb.deleteCall(this.portfolio[index].id, 'portfolio');
          //ADD NEW SUMMARY
          let volumn = 0;
          let total_capital = 0;
          let total_revenue = 0;
          this.orders.forEach(item =>{
            volumn += item['stock_code'] == payload.new['stock_code'] && item['order_type'] == 'BUY' ? item['quantity']: 0;
            total_capital += item['stock_code'] == payload.new['stock_code'] && item['order_type'] == 'BUY' ? item['total_amount']: 0;
            total_revenue += item['stock_code'] == payload.new['stock_code']  && item['order_type'] == 'SELL' ? item['total_amount']: 0;
            item['stock_code'] == payload.new['stock_code'] ? this.sb.deleteCall(item.id, 'orders') : '';
          })
          const newOrder = await this.sb.addCall({
            stock_code: payload.new['stock_code'],
            average_price: total_capital/volumn,
            volumn: volumn,
            total_capital: total_capital,
            total_revenue: total_revenue,
          }, 'summary')
          this.isDeleteAllOrders = false;
        }
      }
      if (payload.eventType === 'DELETE') {
        this.portfolio = this.portfolio.filter(o => o.id !== payload.old.id);
        this.listStockCodePortfolio = [];
        this.portfolio.forEach(item => {
          if (item.stock_code != '') this.listStockCodePortfolio.push(item.stock_code);
        })
      }
    });
    ///CASH FLOW REALTIME
    this.subscriptionses = this.sb.listenCashFlow(async (payload) => {
      if (payload.eventType === 'INSERT') {
        this.cashFlow.unshift(payload.new);
        this.cashIn = this.cashFlow.filter(item => item.type == 'DEPOSIT')
        this.cashOut = this.cashFlow.filter(item => item.type == 'WITHDRAW')
      }
      if (payload.eventType === 'UPDATE') {
        const index = this.cashFlow.findIndex(o => o.id === payload.new.id);
        if (index !== -1) this.cashFlow[index] = payload.new;
      }
      if (payload.eventType === 'DELETE') {
        this.cashFlow = this.cashFlow.filter(o => o.id !== payload.old.id);
        this.cashIn = this.cashFlow.filter(item => item.type == 'DEPOSIT')
        this.cashOut = this.cashFlow.filter(item => item.type == 'WITHDRAW')
      }
    });
    ///SUMMARY REALTIME
    this.subscriptionSummary = this.sb.listenSummary(async (payload) => {
      if (payload.eventType === 'INSERT') {
        this.summaries.unshift(payload.new);
        // this.cashIn = this.cashFlow.filter(item => item.type == 'DEPOSIT')
        // this.cashOut = this.cashFlow.filter(item => item.type == 'WITHDRAW')
      }
      if (payload.eventType === 'UPDATE') {
        const index = this.summaries.findIndex(o => o.id === payload.new.id);
        if (index !== -1) this.summaries[index] = payload.new;
      }
      if (payload.eventType === 'DELETE') {
        this.summaries = this.cashFlow.filter(o => o.id !== payload.old.id);
        // this.cashIn = this.cashFlow.filter(item => item.type == 'DEPOSIT')
        // this.cashOut = this.cashFlow.filter(item => item.type == 'WITHDRAW')
      }
    });
  }

  ////GET REALTIME STOCK PRICE WEBSOCKET
  refresh() {
    this.realtime.fetchHistory(this.listStockCodePortfolio).subscribe({
      next: (res) => {
        if (res?.data) {
          const data = Object.values(res.data) as StockData[];
          this.stocks = data;
          if (this.stockPrevious.length <= 0) {
            this.stockPrevious = this.stocks;
            console.log('thissssss', this.stockPrevious)
          }
          this.errorCount = 0; // reset khi thành công
          console.log('dataaaaaaaaaaaaaaaaaa', this.stocks)
        }
      },
      error: (err) => {
        this.errorCount++;
        console.warn(`❌ Lỗi lần ${this.errorCount}:`, err.message);
        if (this.errorCount >= this.MAX_ERRORS) {
          console.error('🚫 Quá 5 lần lỗi, dừng polling!');
          clearInterval(this.refreshInterval);
        }
      }
    });
  }
  /////

  //STOP UPDATE EVERY 5S
  stopPolling() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('Polling stopped!');
    }
  }

  ngOnDestroy() {
    if (this.subscription) this.sb.removeChannel(this.subscription);
    if (this.subscriptions) this.sb.removeChannel(this.subscriptions);
    if (this.subscriptionses) this.sb.removeChannel(this.subscriptionses);
    if (this.subscriptionSummary) this.sb.removeChannel(this.subscriptionSummary);
    // this.sub?.unsubscribe();
    // this.realtime.disconnect();
    this.stopPolling();
  }

  async getOrders() {
    const { data, count } = await this.sb.getOrders(this.page, this.pageSize);
    this.orders = data ?? [];
    this.totalRecords = count ?? 0;
  }

  async getPortfolio() {
    this.listStockCodePortfolio = [];
    const { data } = await this.sb.getPortfolio();
    this.portfolio = data ?? [];
    this.portfolio.forEach(item => {
      if (item.stock_code != '') this.listStockCodePortfolio.push(item.stock_code);
    })
  }

  async getCashFlow() {
    const { data } = await this.sb.getCashFlow();
    this.cashFlow = data ?? [];
    this.cashIn = this.cashFlow.filter(item => item.type == 'DEPOSIT')
    this.cashOut = this.cashFlow.filter(item => item.type == 'WITHDRAW')
  }

  async getSummaries() {
    const { data } = await this.sb.getSummaries();
    this.summaries = data ?? [];
  }

  async addCall(table: string) {
    //compare total buy and sell to check add condition
    let newOrder;
    this.portfolioList = this.portfolio.filter(
      (data) => data.stock_code == this.orderBody['stock_code']
    );
    if (this.orderBody['order_type'] == 'SELL' && this.portfolioList.length > 0) {
      if (this.portfolioList[0]['total_sell_quantity'] + parseInt(this.orderBody['quantity']) <= this.portfolioList[0]['total_buy_quantity']) {
        newOrder = await this.sb.addCall({
          stock_code: this.orderBody['stock_code'],
          order_type: this.orderBody['order_type'],
          quantity: parseInt(this.orderBody['quantity']),
          price_buy: this.populateAveragePriceOrder(),
          price_sell: parseInt(this.orderBody['price_sell']),
          total_amount: parseInt(this.orderBody['price_sell']) * parseInt(this.orderBody['quantity']),
          created_at: this.orderBody['created_at'],
          description: this.orderBody['description']
        }, table);
      }else{
        alert('Total Sell quantity must not exceed Total Buy quantity!')
      }
    } else if (this.orderBody['order_type'] == 'BUY') {
      newOrder = await this.sb.addCall({
        stock_code: this.orderBody['stock_code'],
        order_type: this.orderBody['order_type'],
        quantity: parseInt(this.orderBody['quantity']),
        price_buy: parseInt(this.orderBody['price_buy']),
        price_sell: parseInt(this.orderBody['price_sell']),
        total_amount: parseInt(this.orderBody['price_buy']) * parseInt(this.orderBody['quantity']),
        created_at: this.orderBody['created_at'],
        description: this.orderBody['description']
      }, table);
    } else {
      alert('Can not add SELL order. Please add BUY order first!')
    }
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

  async addCashFlow(table: string) {
    const newOrder = await this.sb.addCall({
      type: this.cashBody['type'],
      total_amount: parseInt(this.cashBody['total_amount']),
      created_at: this.cashBody['created_at'],
      status: this.cashBody['status']
    }, table);
    if (newOrder) {
      Object.keys(this.orderBody).forEach(key => {
        if (key != 'type') {
          this.orderBody[key] = ''
        } else {
          this.orderBody[key] = 'DEPOSIT'
        }
      });
      this.isAddCash = false;
    }
  }

  //  async updateCashFlow(totalBuyQuantity: any, totalBuyAmount: any) {
  //   let edited = await this.sb.updateCall(this.portfolioList[0].id, {
  //     average_price: totalBuyAmount / totalBuyQuantity,
  //     total_buy_quantity: totalBuyQuantity,
  //     total_buy_amount: totalBuyAmount,
  //     total_sell_quantity: 0,
  //     total_sell_amount: 0
  //   }, 'cash_flow');
  // }


  async updatePortfolio(total_Quantity: any, total_Amount: any, order_type: any) {
    let average_price = order_type == 'BUY' ? (total_Amount - this.portfolioList[0]['total_sell_amount']) / (total_Quantity - this.portfolioList[0]['total_sell_quantity']) : this.portfolioList[0]['average_price'];
    //  this.portfolioList[0]['total_buy_quantity'] - total_Quantity > 0 ? (this.portfolioList[0]['total_buy_amount'] - total_Amount) / (this.portfolioList[0]['total_buy_quantity'] - total_Quantity) : this.portfolioList[0]['average_price'];
    let edited = await this.sb.updateCall(this.portfolioList[0].id, {
      average_price: average_price,
      total_buy_quantity: order_type == 'BUY' ? total_Quantity : this.portfolioList[0]['total_buy_quantity'],
      total_buy_amount: order_type == 'BUY' ? total_Amount : this.portfolioList[0]['total_buy_amount'],
      total_sell_quantity: order_type == 'SELL' ? total_Quantity : this.portfolioList[0]['total_sell_quantity'],
      total_sell_amount: order_type == 'SELL' ? total_Amount : this.portfolioList[0]['total_sell_amount'],
    }, 'portfolio');
  }

  // addNewPortfolio() {

  // }

  async deleteOrder(item: any, table: string) {
    let isCheckDel = true;
    for (const element of this.orders) {
      if (item.stock_code == element.stock_code && item['order_type'] == 'BUY' && element['order_type'] == 'SELL') {
        alert('Please delete ALL SELL orders first!');
        isCheckDel = false;
        break;
      }
    }
    if (isCheckDel) {
      if (confirm('Bạn có chắc muốn xoá lệnh này không?')) {
        this.delete_order = item;
        await this.sb.deleteCall(item.id, table);
        // this.orders = this.orders.filter(o => o.id !== item.id);
      }
    }
  }

  async deleteCashFlow(id: any, table: any) {
    if (confirm('Bạn có chắc muốn xoá lệnh này không?')) {
      await this.sb.deleteCall(id, table);
      // this.orders = this.orders.filter(o => o.id !== item.id);
    }
  }

  async deletePortfolio(item: any, table: string) {
    let isCheckDel = true;
    for (const element of this.orders) {
      if (item.stock_code == element.stock_code) {
        isCheckDel = false;
        break;
      }
    }
    if (isCheckDel) {
      await this.sb.deleteCall(this.portfolioList[0].id, table);
      return true;
    }
    return false;
  }

  //SHOW AVERAGE PRICE
  showExchangePrice(item: any) {
    for (let i = 0; i < this.stocks.length; i++) {
      if (this.stocks[i].code == item.stock_code) return this.stocks[i].close * 1000
    }
    return 0
  }
  // PROFITS/LOST
  calculateProfitLost(item: any) {
    for (let i = 0; i < this.stocks.length; i++) {
      if (this.stocks[i].code == item.stock_code) return this.stocks[i].close * 1000 * (item['total_buy_quantity'] - item['total_sell_quantity']) - (item.total_buy_amount - item.total_sell_amount)
    }
    return 0
  }

  percentProfitLost(item: any){
    return item.total_buy_amount- item.total_sell_amount > 0 ? this.calculateProfitLost(item) / (item.total_buy_amount - item.total_sell_amount) : 0
  }

  totalProfitsLost() {
    let total = 0
    this.stocks.forEach(stock => {
      this.portfolio.forEach(portfo => {
        if (stock.code == portfo.stock_code) total += stock.close  * 1000 * (portfo['total_buy_quantity'] - portfo['total_sell_quantity']) - (portfo.total_buy_amount - portfo.total_sell_amount)
      })
    })
    return total;
  }

  openPopup(order: any): void {
    const dialogRef = this.dialog.open(EditOrderComponent, {
      width: "58%", // Optional: set width
      maxWidth: '100%',
      height: "auto",
      data: { item: order, type_edit: this.isShowOption } // Optional: pass data to the popup
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
      this.portfolio.forEach(element => {
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
    }
  }

  onChangeValueCash(event: any, fieldName: any) {
    if (event) {
      if (fieldName == 'type' && this.cashBody[fieldName] != event) {
        Object.keys(this.cashBody).forEach(key => {
          if (key != 'type') {
            this.cashBody[key] = ''
          } else {
            this.cashBody[key] = 'DEPOSIT'
          }
        });
      }
      const value = event.target.value;
      this.cashBody[fieldName] = value;
    }
  }

  onAddNewOrder() {
    this.isAdd = true;
  }

  onAddNewCashFlow() {
    this.isAddCash = true;
  }

  onChangeTab(index: any) {
    this.isShowOption = this.listmenu[index].path;
    this.currentStep = index;
    switch (this.isShowOption) {
      case 'orderList':
        this.isAddCash = false;
        break;
      case 'cashFlow':
        this.isAdd = false;
        break;
      default:
        this.isAdd = this.isAddCash = false;
        break;
    }
  }

  styleForCardItem(index: any) {
    if (index == 0) {
      return 'first-card'
    }
    if (index == this.listmenu.length - 1) {
      return 'last-card'
    }
    return ''
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

  onCloseCash() {
    Object.keys(this.cashBody).forEach(key => {
      if (key != 'type') {
        this.cashBody[key] = ''
      } else {
        this.cashBody[key] = 'DEPOSIT'
      }
    });
    this.isAddCash = false
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
          } else {
            return ''
          }
      }
    }
    return ''
  }

  getCashInOutList() {
    this.cashIn = this.cashFlow.filter(item => item.type == 'DEPOSIT')
    this.cashOut = this.cashFlow.filter(item => item.type == 'WITHDRAW')
  }

  calculateCashInOut(type: string) {
    let total = 0;
    type == 'DEPOSIT' ? this.cashIn.forEach(item => { total += parseInt(item.total_amount) }) : this.cashOut.forEach(item => { total += parseInt(item.total_amount) })
    return total;
  }

  // paginator(event: any, table: any) {
  //   this.from = (this.page - 1) * this.pageSize;
  //   this.to = this.from + this.pageSize - 1;
  //   if(table == 'orders'){
  //     this.getOrders()
  //   }else if(table == 'cashFlow'){
  //     this.getCashFlow();
  //   }
  // }
  async loadPage(pageIndex: number, pageSize: number, table: any) {
    this.page = pageIndex + 1; // Supabase bắt đầu từ 1
    this.pageSize = pageSize;
    if (table == 'orders') {
      await this.getOrders();
    }
    // this.cashFlows = data || [];
    // this.totalRecords = count || 0;
  }

  onPageChange(event: PageEvent, table: any) {
    this.pageSize = event.pageSize;
    // this.currentPage = event.pageIndex;
    this.loadPage(event.pageIndex, this.pageSize, table);
  }
}
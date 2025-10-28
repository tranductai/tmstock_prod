import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SupabaseService } from '../../../services/supabase.service';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-edit-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './edit-order.component.html',
  styleUrl: './edit-order.component.css'
})
export class EditOrderComponent {
  orderBody: { [key: string]: string } = {
    "stock_code": '',
    "order_type": 'BUY',
    "quantity": '',
    "price_buy": '',
    "price_sell": '',
    "total_amount": '',
    "created_at": '',
    "description": ''
  };
  cashBody: { [key: string]: string } = {
    "type": 'DEPOSIT',
    "total_amount": '',
    "created_at": '',
    "status": ''
  }
  totalMount: any;
  issuedDate: any;
  constructor(public dialogRef: MatDialogRef<EditOrderComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, private sb: SupabaseService, private datePipe: DatePipe) {
    this.totalMount = this.data.item.total_amount;
    // this.issuedDate = this.datePipe.transform(this.data.item.total_amount, 'MM/dd/yyyy');
    this.issuedDate = new Date(this.data.item.created_at).toISOString().split('T')[0];
    Object.keys(this.orderBody).forEach(key => {
      if (key != '') {
        this.orderBody[key] = this.data.item[key]
      }
    });
  }

  async editOrder() {
    const updated_amount = this.data.item.order_type == 'BUY' ?
    (parseInt(this.orderBody['price_buy']) * parseInt(this.orderBody['quantity'])) - this.data.item.total_amount : 
    (parseInt(this.orderBody['price_sell']) * parseInt(this.orderBody['quantity'])) - this.data.item.total_amount
    const updated_quantity = parseInt(this.orderBody['quantity']) - this.data.item.quantity
    //Gán giá trị chênh lệch giữa lệnh ban đầu và lênh update để update cho bảng portfolio(mới - cũ)
    this.sb.bodyUpdatePortfolio = {
      updated_buy_quantity: this.data.item.order_type == 'BUY' ? updated_quantity : 0,
      updated_buy_amount: this.data.item.order_type == 'BUY' ? updated_amount : 0,
      updated_sell_quantity: this.data.item.order_type == 'SELL' ? updated_quantity : 0,
      updated_sell_amount: this.data.item.order_type == 'SELL' ? updated_quantity : 0,
    }
    let edited = await this.sb.updateCall(this.data.item.id, {
      stock_code: this.orderBody['stock_code'],
      order_type: this.orderBody['order_type'],
      quantity: parseInt(this.orderBody['quantity']),
      price_buy: parseInt(this.orderBody['price_buy']),
      price_sell: parseInt(this.orderBody['price_sell']),
      total_amount: this.data.item.order_type == 'BUY' ? 
          parseInt(this.orderBody['price_buy']) * parseInt(this.orderBody['quantity']):
          parseInt(this.orderBody['price_sell']) * parseInt(this.orderBody['quantity']),
      created_at: this.orderBody['created_at'],
      description: this.orderBody['description']
    }, 'orders');
    this.dialogRef.close();
  }

  async editCashFlow() {
    let edited = await this.sb.updateCall(this.data.item.id, {
      type: this.cashBody['type'],
      total_amount: this.cashBody['total_amount'],
      created_at: this.cashBody['created_at'],
      status: this.cashBody['status']
    }, 'cash_flow');
  }

  onChangeValue(event: any, fieldName: keyof typeof this.orderBody) {
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
      if (this.orderBody['quantity'] != '') {
        this.totalMount = this.orderBody['price_buy'] != '' ? parseInt(this.orderBody['price_buy']) * parseInt(this.orderBody['quantity']) :
          this.orderBody['price_sell'] != '' ? parseInt(this.orderBody['price_sell']) * parseInt(this.orderBody['quantity']) : 0
      }
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

  parseInt(item: any) {
    return parseInt(item)
  }

  onClose(): void {
    this.dialogRef.close();
  }
}

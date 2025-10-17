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
    const updated_buy_amount = (parseInt(this.orderBody['price_buy']) * parseInt(this.orderBody['quantity'])) - this.data.item.total_amount;
    const updated_buy_quantity = parseInt(this.orderBody['quantity']) - this.data.item.quantity;
    //Gán giá trị chênh lệch giữa lệnh ban đầu và lênh update để update cho bảng summary(mới - cũ)
    this.sb.bodyUpdateSummary = {
      updated_buy_quantity: updated_buy_quantity,
      updated_buy_amount: updated_buy_amount,
      updated_sell_quantity: 0,
      updated_sell_amount: 0
    }
    let edited = await this.sb.updateCall(this.data.item.id, {
      stock_code: this.orderBody['stock_code'],
      order_type: this.orderBody['order_type'],
      quantity: parseInt(this.orderBody['quantity']),
      price_buy: parseInt(this.orderBody['price_buy']),
      price_sell: parseInt(this.orderBody['price_sell']),
      total_amount: parseInt(this.orderBody['price_buy']) * parseInt(this.orderBody['quantity']),
      created_at: this.orderBody['created_at'],
      description: this.orderBody['description']
    }, 'orders');
    this.dialogRef.close();
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

  parseInt(item: any) {
    return parseInt(item)
  }

  onClose(): void {
    this.dialogRef.close();
  }
}

import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';
@Directive({
    selector: '[digitAddCommas]',
    standalone: true
})

export class DigitAddCommasDirective {
  private regex: RegExp = new RegExp(/^\d{0,7}(\.\d{0,2})?$/g);
  @Input("fractions") fractions : any;
  @Input("wholes") wholes = 7
  @Input("tmComponent") tmComponent: boolean | undefined;
  private decimalCounter = 0;
  private navigationKeys = [
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'Home',
    'End',
    'ArrowLeft',
    'ArrowRight',
    'Clear',
    'Copy',
    'Paste'
  ];
  decimal = true;
  elementValue : any;
  isDisabled = false;
  constructor(public el: ElementRef,
               private renderer2: Renderer2) {
  }

  ngOnInit() {
    this.fractions = this.fractions ? Number(this.fractions) : '2';
    if(this.tmComponent === true) {
      this.elementValue = this.el.nativeElement.firstElementChild.firstElementChild.firstElementChild.firstElementChild.nextElementSibling;
      this.renderer2.listen(this.el.nativeElement, 'click', (evt) => {
        if(evt && !this.isElDisabled()) {
          const initalValue = this.elementValue.value;
          this.elementValue.value = initalValue.replace(/[^\d.-]/g, '');
          if(this.elementValue.value.length > 1 && this.elementValue.value[this.elementValue.value.length - 3] == '.'){
            this.elementValue.value = this.elementValue.value.slice(0,-3);
          }
        }
      });
    } else {
      this.elementValue =  this.el.nativeElement;
    }
    setTimeout(() => {
      if(this.elementValue.value != "" && this.elementValue.value[this.elementValue.value.length - 3] != '.'){
        this.elementValue.value = this.addCommas(this.elementValue.value) + '.00'; // the directive needs time to grab the model value

      }

    }, 0);
  }

  ngAfterViewChecked() {
    if(this.isElDisabled() && this.elementValue.value) {
      this.elementValue.value = this.addCommas(this.elementValue.value);
    }
  }

  isElDisabled(): boolean{
    return this.el.nativeElement.classList.contains("disabled");
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (
      this.navigationKeys.indexOf(e.key) > -1 || // Allow: navigation keys: backspace, delete, arrows etc.
      (e.key === 'a' && e.ctrlKey === true) || // Allow: Ctrl+A
      (e.key === 'c' && e.ctrlKey === true) || // Allow: Ctrl+C
      (e.key === 'v' && e.ctrlKey === true) || // Allow: Ctrl+V
      (e.key === 'x' && e.ctrlKey === true) || // Allow: Ctrl+X
      (e.key === 'a' && e.metaKey === true) || // Allow: Cmd+A (Mac)
      (e.key === 'c' && e.metaKey === true) || // Allow: Cmd+C (Mac)
      (e.key === 'v' && e.metaKey === true) || // Allow: Cmd+V (Mac)
      (e.key === 'x' && e.metaKey === true) || // Allow: Cmd+X (Mac)
      (e.key === '.' && this.decimalCounter < 1) // Allow: only one decimal point
    ) {
      // let it happen, don't do anything
      return;
    }
    if(this.fractions !== 0) {
      let current: string = this.elementValue.value;
      const position = this.elementValue.selectionStart;
      const next: string = [current.slice(0, position), e.key == 'Decimal' ? '.' : e.key, current.slice(position)].join('');
      // Ensure that it is a number and stop the keypress
        if ( !this.check(next) && next) {
        e.preventDefault();
      }
    }
  }
  @HostListener('input', ['$event']) onChange(event: any) {
    const initalValue = this.elementValue.value;
    this.elementValue.value = initalValue.replace(/[^\d.-]/g, '');
    if ( initalValue !== this.elementValue.value) {
      event.stopPropagation();
    }
  }
  @HostListener('keyup', ['$event'])
  onKeyUp(e: KeyboardEvent) {
      this.decimalCounter = this.elementValue.value.split('.').length - 1;
  }
  @HostListener('focusout') onBlur(event: any) {
    if(this.elementValue.value.length > 3){
      let temp = this.elementValue.value.slice(-3);
      if(temp != '.00'){
        this.elementValue.value = this.addCommas(this.elementValue.value) + '.00';
      }
    }
  }
  @HostListener('focus') onFocus(event: any) {
    const initalValue = this.elementValue.value;
    this.elementValue.value = initalValue.replace(/[^\d.-]/g, '');
  }
  private check(value: string) {
    // RegExp(/^\d{0,7}(\.\d{1,2})?$/g);
    if (this.wholes <= 0) {
        return String(value).match(new RegExp(/^\d{0,7}(\.\d{1,2})?$/g));
    } else {
        var regExpString = "^\\d{0," + this.wholes + "}(\\.\\d{1," + this.fractions + "})?$";
        return String(value).match(new RegExp(regExpString));
    }
  }
  private addCommas(value: string) {
    let initalValue = value;
    if(this.fractions !== 0) {
      initalValue = initalValue ? parseFloat(initalValue).toFixed(2): '';
    }
    return  initalValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

}

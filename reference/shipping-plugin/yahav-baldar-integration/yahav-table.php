<?php 
    require_once( ABSPATH . 'wp-admin/includes/class-wp-list-table.php' );

class Yahav_Table extends WP_List_Table {
	function get_columns(){
  $columns = array(
    'cb'         => '<input type="checkbox" />', // Add the checkbox column
    'id' => 'פרטי עסקה',
    'type'      => 'סוג הקנייה',
    'date'      => 'תאריך',
    'status'      => 'סטטוס',
    'remarks'    => 'הערות',
    'options'    => 'אפשרויות',
    'action'      => 'פעולות'
  );
  return $columns;
}

function prepare_items() {
    $orders = wc_get_orders( array(
        'limit'        => -1, // Query all orders
        'orderby'      => 'date',
        'order'        => 'DESC',
        'meta_key'     => 'baldar_status', // The postmeta key field
        'meta_compare' => '==', // The comparison argument
        'meta_value'   => 'Waiting'
    ));
    $ordersTable = [];
    foreach($orders as $order)
    {
      // var_dump($order->get_meta("baldar_status"));
        $single = [
            'order'=>$order,
            'date'=>$order->order_date,
            'status'=>$order->get_status(),
        ];
            $ordersTable[] = $single;
    }
	$per_page = 50;
	  $current_page	 = $this->get_pagenum();
  $columns = $this->get_columns();
  $hidden = array();
  $sortable = array();
  $this->set_pagination_args( array(
    'total_items' => sizeof($ordersTable),                  //WE have to calculate the total number of items
    'per_page'    => $per_page                     //WE have to determine how many items to show on a page
  ) ); 
  
 $this->_column_headers = array($columns, $hidden, $sortable);
  $this->items = array_slice($ordersTable,(($current_page-1)*$per_page),$per_page);
}
function column_default( $item, $column_name ) {
  $order = $item['order'];
  $wc = $order->get_data();
  switch( $column_name ) { 
    case 'id':
      ob_start();
      [$personName, $destAddr,$destAddrNum,$destCity,$destPhone, $email] = getOrderDataBillingOrShippingDetailsByUserSettings($wc);
      ?>
        <a target = "_blank" href = "<?= admin_url('post.php?post='.$order->ID.'&action=edit') ?>">מספר עסקה באתר: <?= $order->ID ?></a><br />
        <span>שם פרטי: <?= $personName ?></span><br />
        <span>כתובת: <?= $destAddr." ".$destAddrNum ?></span><br />
        <span>עיר: <?= $destCity ?></span><br />
        <span>טלפון: <?= $destPhone ?></span><br />
        <span>אימייל: <?= $email ?></span><br />
        <span>סכום העסקה: <?= get_woocommerce_currency_symbol($order->get_currency()).$order->get_total() ?></span><br />
        <?php
        $contents = ob_get_contents();
        ob_end_clean();
        return $contents;
    // case 'price':
      // return $item["order"]->get_shipping_method();
    case 'date':
      return $item["order"]->order_date;
    case 'status':
      return $item["order"]->get_status();
      case 'type':
      return $item["order"]->get_shipping_method();
      case 'action':
        return $this->getBaldarButton($item['order']->ID);
        case 'remarks':
          return $this->getBaldarRemarks($item['order']->ID);
          case 'options':
            return $this->getBaldarOptions($item['order']->ID);  
          default:
      return print_r( $item, true ) ; //Show the whole array for troubleshooting purposes
  }
}
function getBaldarButton($id){
    ob_start(); ?>
    <button class="acceptOrder yahav-button" data-orderid = "<?php echo $id; ?>" ><i class="dashicons-before dashicons-yes"></i>תכניס לבלדר</button>
    <button class="declineOrder yahav-button red" data-orderid = "<?php echo $id; ?>" ><i class="dashicons-before dashicons-no"></i>אל תכניס לבלדר</button>

<?php
    return ob_get_clean();
}
function getBaldarRemarks($id){
  ob_start(); ?>
  <textarea class="orderRemarks" style = "width:100%; height:50px;" placeholder = "הערות לעסקה זו (לא חובה)" data-orderid = "<?php echo $id; ?>" ></textarea>

<?php
  return ob_get_clean();
}
function getBaldarOptions($id){
  ob_start();
  $orderObj = wc_get_order($id);
  $paymentMethod = $orderObj->get_payment_method();
  $gov = 0;
  if($paymentMethod == "cod"){
    $gov = $orderObj->get_total();
  }
  ?>
    <button class="orderOptions" data-orderid = "<?php echo $id; ?>" ><i class="dashicons-before dashicons-admin-generic"></i>אפשרויות נוספות</button>
    <input type = "hidden" name = "shippingtype" value = "normal" >
    <input type = "hidden" name = "gov" value = "<?= $gov ?>" >
    <input type = "hidden" name = "transporttype" value = "car" >
    <input type = "hidden" name = "numberofpackages" value = "1" >
<?php
  return ob_get_clean();
}

function column_cb($item) {
  return '<input type="checkbox" name="order_ids[]" value="' . esc_attr( $item['order']->ID ) . '" />';
}

function extra_tablenav($which) {
  if ($which == 'top') { // Top navigation
      ?>
         <div class="yahav-main-table-custom-buttons">
            <div class="alignleft">
                <button type="button" class="button" id = "accept-all-baldar-orders" style = "display:none">אישור עסקאות נבחרות</button>
            </div>
            <div class="alignright">
            <button type="button" class="button" id = "select-all-baldar-page-print-checkboxes" style = "display:none">סימון כל העסקאות שהוכנסו להדפסה</button>
            </div>
        </div>
      <?php
  }

}

}
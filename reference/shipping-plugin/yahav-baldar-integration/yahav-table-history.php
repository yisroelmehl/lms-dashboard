<?php 

require_once( ABSPATH . 'wp-admin/includes/class-wp-list-table.php' );

class Yahav_Table_History extends WP_List_Table {
  function get_columns(){
  $columns = array(
    'id' => 'מספר עסקה',
    'type'    => 'סוג הקנייה',
    'receiver_name'      => 'שם מקבל',
    'date'      => 'תאריך ביצוע המשלוח',
    'status'      => 'סטטוס בלדר',
    'baldar_barcode'      => 'מספר משלוח'
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
        'meta_value'   => 'Approved'
    ));
    $ordersTable = [];
    foreach($orders as $order)
    {
        $barcodeId = $order->get_meta("baldar_barcode");
        $customerId = get_option('client_code');
        $originalXml = file_get_contents("http://212.150.254.6/Baldarp/Service.asmx/ListDeliveryDetails?customerId=$customerId&deliveryNumbers=$barcodeId");
        $xml = (array)simplexml_load_string($originalXml); 
        $xml = simplexml_load_string($xml[0]);
        $json = json_encode($xml);
      $array = json_decode($json,TRUE);
      if(!isset($array['Records']['Record']['DeliveryStatus'])) continue;
      
        $single = [
            'id'=>$order->ID,
            'type'=>$order->get_shipping_method(),
            'date'=>$array['Records']['Record']['DeliveryStatus'] == 3 ? $array['Records']['Record']['ExeTime']: '',
            'receiver_name'=>$array['Records']['Record']['DeliveryStatus'] == 3 ? $array['Records']['Record']['Receiver']: '',
            'status'=>$this->getBaldarStatus($array),
            'baldar_barcode'=>$barcodeId
            
        ];
            $ordersTable[] = $single;
    }
	$per_page = 10;
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
  switch( $column_name ) { 
    case 'id':
        return '<a target = "_blank" href = "'.admin_url('post.php?post='.$item[ $column_name ].'&action=edit').'">'.$item[ $column_name ].'</a>';
    case 'type':
    case 'date':
    case 'status':
    case 'baldar_barcode':
      case 'receiver_name':
      return $item[ $column_name ];
    default:
      return print_r( $item, true ) ; //Show the whole array for troubleshooting purposes
  }
}
function getBaldarStatus($array){
  $statusList = [
    1=>'
    <strong class = "waiting-color">
    פתוח
    </strong>
    ',
    2=>'
    <strong class = "waiting-color">
    הועבר לשליח
    </strong>',
    3=>'
    <strong class = "completed-color">
    בוצע
    </strong>
    ',
    4=>'    <strong class = "waiting-color">
נאסף
</strong>
',
    5=>'חזר מכפולה',
    7=>'אושר ביצוע',
    8=>'<strong class = "cancelled-color">
    מבוטל
    </strong>',
    9=>'שליח שני',
    12=>'<strong class = "waiting-color">משלוח בהמתנה</strong>',
    13=>'<strong class = "waiting-color">במחסן</strong>',
    50=>'<strong class = "completed-color">בדרך לנמען</strong>'
  ];
  return $statusList[$array['Records']['Record']['DeliveryStatus']];

}
}
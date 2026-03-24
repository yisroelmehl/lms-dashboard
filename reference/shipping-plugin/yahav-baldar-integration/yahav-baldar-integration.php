<?php

/**
 * Plugin Name: יהב לוגיסטיקה
 * Plugin URI: https://yahavlog.co.il/
 * Description: פלאגין לניהול משלוחים אוטומטי שמותאם לווקומרס.
 * Version: 1.91
 * Author: יהב לוגיסטיקה בע"מ
 */

define('VER', '1.91');
defined('ABSPATH') or die('No script kiddies please!');
include(plugin_dir_path(__FILE__) . 'yahav-table.php');
include(plugin_dir_path(__FILE__) . 'yahav-table-history.php');
// create custom plugin settings menu
add_action('admin_menu', 'yahav_logistics_menu');

function yahav_logistics_menu()
{

    //create new top-level menu
    add_menu_page('אישור עסקאות לבלדר', 'אישור עסקאות לבלדר', 'manage_woocommerce', 'yahav_main_slug', 'yahav_main', '', 26);
    add_submenu_page('yahav_main_slug', 'הגדרות כלליות', 'הגדרות כלליות', 'manage_woocommerce', 'yahav_settings_slug', 'yahav_settings_page');
    add_submenu_page('yahav_main_slug', 'סטטוס עסקאות', 'סטטוס עסקאות', 'manage_woocommerce', 'yahav_status_slug', 'yahav_status_page');
    add_submenu_page('yahav_main_slug', 'כניסה לבלדר', 'כניסה לבלדר', 'manage_woocommerce', 'yahav_baldar_link_slug', 'yahav_baldar_link_page');
    // add_submenu_page('yahav_main_slug','סרטון הדרכה', 'סרטון הדרכה', 'administrator', 'yahav_baldar_video_slug', 'yahav_baldar_video_page' );


    //call register settings function
    add_action('admin_init', 'register_yahav_settings');
}

function yahav_scripts()
{
    $plugin_url = plugin_dir_url(__FILE__);
    wp_enqueue_script('jquery-ui-core');
    wp_enqueue_script('jquery-ui-dialog');

    wp_enqueue_style('wp-jquery-ui-dialog');
    wp_enqueue_style('admin-style-yahav', $plugin_url . 'style.css', [], VER);
    wp_enqueue_script(
        'admin-script-print',
        'https://printjs-4de6.kxcdn.com/print.min.js',
        [],
        '1.2.3'
    );
    wp_enqueue_script(
        'admin-script-html2canvas',
        $plugin_url.'htmltoimage.js',
        [],
        '1.2.3'
    );
    wp_enqueue_script(
        'admin-script-jspdf',
        'https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js',
        ['admin-script-html2canvas'],
        '1.2.3'
    );

    wp_enqueue_script(
        'admin-script-jsbarcode',
        'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/barcodes/JsBarcode.code39.min.js',
        [],
        '1.2.3'
    );
    wp_enqueue_script(
        'admin-script-yahav',
        $plugin_url . 'custom.js',
        ['jquery', 'jquery-ui-core', 'jquery-ui-dialog', 'admin-script-print', 'admin-script-jspdf', 'admin-script-jsbarcode'],
        VER,
        true
    );
    wp_localize_script(
        'admin-script-yahav',
        'extraParams',
        [
            "sticker_print_mode"=>get_option('sticker_print_mode')
        ]
    );    
}
add_action('admin_enqueue_scripts', 'yahav_scripts');

function register_yahav_settings()
{
    //register our settings
    register_setting('yahav-settings-group', 'client_code');
    register_setting('yahav-settings-group', 'remarks');
    register_setting('yahav-settings-group', 'origin_city');
    register_setting('yahav-settings-group', 'origin_street');
    register_setting('yahav-settings-group', 'origin_street_num');
    register_setting('yahav-settings-group', 'origin_company');
    register_setting('yahav-settings-group', 'company_contact');
    register_setting('yahav-settings-group', 'shipping_field', ['default' => 'any']);
    register_setting('yahav-settings-group', 'remarks_products_details', ['default' => 0]);
    register_setting('yahav-settings-group', 'sticker_print_mode', ['default' => 'multiple-in-a4-page']);
}
function yahav_baldar_link_page()
{
    wp_redirect('http://212.150.254.6/Baldar/Login.aspx');
    exit;
}
function target_blank_script()
{
?>
    <script type="text/javascript">
        jQuery(document).ready(function($) {
            $("ul#adminmenu a[href$='yahav_baldar_link_slug']").attr('target', '_blank');
        });
    </script>
<?php
}
add_action('admin_head', 'target_blank_script');

add_action('admin_footer', 'yahav_admin_footer');

function yahav_admin_footer()
{
?>
    <div class="loader-modal">
        <div class="loader-modal-content">
            <div class="loader-container">
                <div class="loader"></div>
            </div>
            <h3>מעדכן... אנא המתן</h3>
        </div>
    </div>
    <!-- NEXT UPDATE -->
    <div id="print-barcodes">
        <img src="<?php echo plugin_dir_url(__FILE__) ?>images/barcode.svg">
        <h4>הדפס ברקודים מסומנים</h4>
    </div>
    <div id="print_element" style="">
        <div id="print_element_container" style="display:none;">
        </div>
    </div>

    <div class="hidden extra-options" style="max-width:800px">
        <form method="post" action="" novalidate="novalidate" data-extra-submit="0">
            <input type="hidden" name="option_page" value="general"><input type="hidden" name="action" value="update"><input type="hidden" id="_wpnonce" name="_wpnonce" value="7cfc564774"><input type="hidden" name="_wp_http_referer" value="/baldarTest/wp-admin/options-general.php">
            <table class="form-table" role="presentation">

                <tbody>
                    <tr>
                        <th scope="row"><label for="shippingtype-fill">סוג משלוח</label></th>
                        <td>
                            <select name="shippingtype-fill" class="regular-text order-field">
                                <option value="normal">רגיל</option>
                                <option value="double">כפול</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="gov-fill">גוביינא</label></th>
                        <td>
                            <input type="text" class="regular-text order-field" name="gov-fill">
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="transporttype-fill">סוג דיוור</label></th>
                        <td>
                            <select name="transporttype-fill" class="regular-text order-field">
                                <option value="car">רכב</option>
                                <option value="motorcycle">קטנוע</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="numberofpackages-fill">כמות חבילות</label></th>
                        <td>
                            <input type="number" class="regular-text order-field" value="1" name="numberofpackages-fill">

                        </td>
                    </tr>
                    <tr class="remarks-fill-row">
                        <th scope="row"><label for="remarks-fill">הערות</label></th>
                        <td>
                            <textarea class="order-field" name="remarks-fill" placeholder="הערות לעסקה זו (לא חובה)"></textarea>

                        </td>
                    </tr>
                </tbody>
            </table>


            <p class="submit"><input type="submit" name="submit" id="submit" class="button button-primary" value="שמור שינויים"></p>
        </form>
    </div>
<?php
}

function yahav_status_page()
{
?>
    <style>
        strong.cancelled-color,
        strong.waiting-color,
        strong.completed-color {
            font-size: 19px;
        }

        strong.cancelled-color {
            color: #F44336;
        }

        strong.waiting-color {
            color: #FFC107;
        }

        strong.completed-color {
            color: #4CAF50;
        }
    </style>
    <div class="wrap">
        <h1>סטטוס עסקאות - יהב</h1>
        <?php
        $table = new Yahav_Table_History();
        $table->prepare_items();
        $table->display();
        ?>
    </div>
<?php
}
function yahav_main()
{
    // // $wc = wc_get_order(35421)->get_data();
    //     $wc = wc_get_order(91)->get_data();
    //     $date = new DateTime("now", new DateTimeZone('Asia/Jerusalem'));
    //     if (get_option('shipping_field') == 'shipping') {
    //         $destAddr = $wc['shipping']['address_1'];
    //         $destAddrNum = $wc['shipping']['address_2'];
    //         $destCity = $wc['shipping']['city'];
    //     } elseif (get_option('shipping_field') == 'billing') {
    //         $destAddr = $wc['billing']['address_1'];
    //         $destAddrNum = $wc['billing']['address_2'];
    //         $destCity = $wc['billing']['city'];
    //     } elseif (get_option('shipping_field') == 'any') {
    //         $destAddr = !empty($wc['billing']['address_1'])?$wc['billing']['address_1']:$wc['shipping']['address_1'];
    //         $destAddrNum = !empty($wc['billing']['address_2'])?$wc['billing']['address_2']:$wc['shipping']['address_2'];
    //         $destCity = !empty($wc['billing']['city'])?$wc['billing']['city']:$wc['shipping']['city'];
    //     }
    //     $options = [
    //     'type'=>1, 'originAddr'=>get_option('origin_street'), 'originAddrNum'=> get_option('origin_street_num'),'originCity'=>get_option('origin_city'),
    //     'originComp'=>get_option('origin_company'),'destComp'=>$personName,'shippingRemarks'=>'הערות הבעלים - '.get_option('remarks').' '.$remarks.' | ','urgent'=>1,'shippingPhysType'=>1,'packageNum'=>0,'double'=>1,
    //     'orderNum'=>$wc['number'],'clientCode'=>get_option('client_code'), 'generalRemarks'=>'','palletNum'=>0,
    //     'destAddr'=>$destAddr,'destAddrNum'=>$destAddrNum,'destCity'=>$destCity,
    //     'contactPerson'=> '','contactPhone' => $wc['billing']['phone'],'contactEmail'=> $wc['billing']['email'],'date'=>$date->format('Y-m-d')
    // ];
    // echo '<script>console.log('.json_encode($options).')</script>';
?>
    <style>
        #the-list tr>td:not(:last-of-type),
        #the-list tr>th:not(:last-of-type) {
            width: 13%;
        }

        .wp-list-table.toplevel_page_yahav_main_slug {
            table-layout: auto;
        }
    </style>
    <div class="wrap" id = "yahav-baldar-main-table">
        <h1>אישור עסקאות לבלדר</h1>
        <div id="message-div-baldar"></div>
        <?php
        $table = new Yahav_Table();
        $table->prepare_items();
        $table->display();
        ?>

    </div>
<?php
}

function yahav_settings_page()
{
?>
    <div class="wrap">
        <h1>הגדרות כלליות</h1>

        <form method="post" action="options.php">
            <?php settings_fields('yahav-settings-group'); ?>
            <?php do_settings_sections('yahav-settings-group'); ?>
            <table class="form-table">
                <tr valign="top">
                    <th scope="row">קוד לקוח</th>
                    <td><input type="text" name="client_code" value="<?php echo esc_attr(get_option('client_code')); ?>" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">הערות כלליות</th>
                    <td><textarea style="width: 270px;
    height: 120px;
    max-width: 100%;" name="remarks"><?php echo esc_attr(get_option('remarks')); ?></textarea></td>
                </tr>
                <tr valign="top">
                    <th scope="row">עיר מוצא</th>
                    <td><input type="text" name="origin_city" value="<?php echo esc_attr(get_option('origin_city')); ?>" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">שם רחוב מוצא</th>
                    <td><input type="text" name="origin_street" value="<?php echo esc_attr(get_option('origin_street')); ?>" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">מספר רחוב מוצא</th>
                    <td><input type="text" name="origin_street_num" value="<?php echo esc_attr(get_option('origin_street_num')); ?>" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">שם החברה</th>
                    <td><input type="text" name="origin_company" value="<?php echo esc_attr(get_option('origin_company')); ?>" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">פרטי מוצר בהערות</th>
                    <td>
                        <div>
                            <input type="checkbox" name="remarks_products_details" id="remarks_products_details" value="1" <?php checked(1, get_option('remarks_products_details'), true); ?> />
                            <label for="remarks_products_details">האם להציג את מוצרי ההזמנה בהערות?</label>
                        </div>
                    </td>
                </tr>
                <tr valign="top">
                    <th scope="row">מצב הדפסת מדבקות</th>
                    <td>
                        <div><input type="radio" name="sticker_print_mode" value="multiple-in-a4-page" <?php checked("multiple-in-a4-page", get_option('sticker_print_mode'), true); ?>>מספר מדבקות בעמוד (מתאים למדפסת רגילה)</div>
                        <div><input type="radio" name="sticker_print_mode" value="single-in-seperate-page" <?php checked("single-in-seperate-page", get_option('sticker_print_mode'), true); ?>>מדבקה בודדת בעמוד (מתאים למדפסת מדבקות)</div>
                    </td>
                </tr>
                <!-- <tr valign="top">
        <th scope="row">איש קשר בחברה</th>
        <td><input type="text" name="company_contact" value="<?php echo esc_attr(get_option('company_contact')); ?>" /></td>
        </tr> -->
                <tr valign="top">
                    <th scope="row">כתובת למשלוח מתוך ההזמנה</th>
                    <td>
                        <div><input type="radio" name="shipping_field" value="shipping" <?php checked("shipping", get_option('shipping_field'), true); ?>>כתובת המשלוח שהוזנה</div>
                        <div><input type="radio" name="shipping_field" value="billing" <?php checked("billing", get_option('shipping_field'), true); ?>>כתובת החיוב שהוזנה</div>
                        <div><input type="radio" name="shipping_field" value="any" <?php checked("any", get_option('shipping_field'), true); ?>>בחירה אוטומטית של הפלאגין של אחד השדות (מה שמלא ייבחר)</div>
                    </td>
                </tr>

            </table>
            <?php
            submit_button(); ?>

        </form>
    </div>
    <?php }

add_action('save_post_shop_order', 'update_frm_entry_after_wc_order_completed');
add_action('woocommerce_thankyou', 'update_frm_entry_after_wc_order_completed', 10, 1);
function update_frm_entry_after_wc_order_completed($order_id)
{
    if (!$order_id)
        return;

    $order = wc_get_order($order_id);
    if (empty($order->get_meta("baldar_status"))) {
        $order->update_meta_data('baldar_status', "Waiting");
        $order->save();
    }
}
add_action('wp_ajax_deny_baldar', 'deny_baldar');
function deny_baldar()
{
    $orderid = $_POST['orderid'];
    $orderObj = wc_get_order($orderid);
    $status = $orderObj->get_meta("baldar_status");
    if ($status == "Waiting") {
        $orderObj->update_meta_data('baldar_status', 'Denied');
        $orderObj->save();
        $response = ['status' => 'Success'];
        echo json_encode($response);
    }
    wp_die();
}
add_action('wp_ajax_baldar_details', 'baldar_details');
function baldar_details()
{
    $barcodeArray = $_POST['printarr'];
    $barcodeArray = implode(';', $barcodeArray);
    $customerId = get_option('client_code');
    $originalXml = file_get_contents("http://212.150.254.6/Baldarp/Service.asmx/ListDeliveryDetails?customerId=$customerId&deliveryNumbers=$barcodeArray");
    $xml = (array)simplexml_load_string($originalXml);
    $xml = simplexml_load_string($xml[0]);
    $json = json_encode($xml);
    $array = json_decode($json, TRUE);
    echo json_encode($array);
    wp_die();
}

add_action('wp_ajax_accept_baldar', 'accept_baldar');
function accept_baldar()
{
    $orderid = $_POST['orderid'];
    $remarks = $_POST['remarks'];
    $extraOptions = $_POST['extraOptions'];
    // echo json_encode(['הערות הבעלים - '.get_option('remarks').' '.$remarks.' | ']);
    // wp_die();

    $originStreet = get_option('origin_street');
    $originStreetNum = get_option('origin_street_num');
    $originCity = get_option('origin_city');
    $originCompany = get_option('origin_company');
    $clientCode = get_option('client_code');

    if (!$clientCode)
        die(json_encode(['status' => 'Error', 'response' => "יש למלא את קוד הלקוח בהגדרות התוסף"]));

    $orderObj = wc_get_order($orderid);
    $status = $orderObj->get_meta("baldar_status");
    if ($status == "Waiting") {
        $date = new DateTime("now", new DateTimeZone('Asia/Jerusalem'));
        $wc = $orderObj->get_data();
        [$personName, $destAddr,$destAddrNum,$destCity,$destPhone, $email] = getOrderDataBillingOrShippingDetailsByUserSettings($wc);
        $destAddrInsert = '';
        $destAddrNumInsert = $destAddr;
        if (preg_match('/[0-9]+/', $destAddr)) {
            //  $destAddrInsert = str_replace(' ');
            preg_match_all('!\d+!', $destAddr, $matches);
            $destAddrInsert = clean(str_replace($matches[0], '', $destAddr));
            // var_dump($destAddrInsert);

            if (sizeof($matches[0]) > 1) {
                $destAddrNumInsert = implode('/', $matches[0]);
            } else $destAddrNumInsert = $matches[0][0];
        } else {
            $destAddrInsert = $destAddr;
            $destAddrNumInsert = $destAddrNum;
        }
        // echo $destAddrNumInsert;
        // exit;
        $generalRemarks = get_option('remarks');
        $seperator = '|';
        if (trim($generalRemarks) == '' || trim($remarks) == '')
            $seperator = '';

        $gov = intval($extraOptions['gov']);
        $double = $extraOptions['shippingtype'] == 'double' ? 2 : 1;
        $govRemarks = "";
        if ($gov > 0) {
            $govRemarks = "גוביינא: $gov ש״ח ";
            $double = 5;
        }

        $shippingRemarks = $govRemarks . $generalRemarks . $seperator . $remarks;
        if (get_option("remarks_products_details") == 1) {
            $orderItems = $orderObj->get_items();
            if (sizeof($orderItems) > 10) {
                die(json_encode(['status' => 'Error', 'response' => "עסקה זו לא הוכנסה לבלדר, יש לפנות לתמיכה."]));
            }
            $shippingRemarks .= " מוצרים: ";
            $count = 1;
            $numToHebLetter = [
                1 => 'א',
                2 => 'ב',
                3 => 'ג',
                4 => 'ד',
                5 => 'ה',
                6 => 'ו',
                7 => 'ז',
                8 => 'ח',
                9 => 'ט',
                10 => 'י'
            ];

            foreach ($orderItems as $item_id => $item) {
                $product_name = $item->get_name();
                $quantity = $item->get_quantity();
                $shippingRemarks .= "($numToHebLetter[$count]) $product_name - יח׳ $quantity ";
                $count++;
            }
        }

        $options = [
            'type' => 1,
            'originAddr' => $originStreet == false ? "" : $originStreet,
            'originAddrNum' => $originStreetNum == false ? "" : $originStreetNum,
            'originCity' => $originCity == false ? "" : $originCity,
            'originComp' => $originCompany == false ? "" : $originCompany,
            'destComp' => $personName,
            'shippingRemarks' => $shippingRemarks,
            'urgent' => 1,
            'shippingPhysType' => $extraOptions['transporttype'] == 'car' ? 2 : 1,
            'packageNum' => intval($extraOptions['numberofpackages']),
            'double' => $double,
            'orderNum' => $wc['number'],
            'clientCode' => $clientCode,
            'generalRemarks' => '',
            'palletNum' => 0,
            'destAddr' => $destAddrInsert,
            'destAddrNum' => $destAddrNumInsert,
            'destCity' => $destCity,
            'contactPerson' => '',
            'contactPhone' => $destPhone,
            'contactEmail' => $email,
            'date' => $date->format('Y-m-d'),
            'gov' => $gov
        ];
        $response = sendPost('http://yahavlog.co.il/yahav-baldar-integration/BaldarCode.php', $options);
        $response = json_decode($response, true);
        // print_r($response);
        if (intval($response['DeliveryNumber']) > 0 && $response != false) {
            // REMOVE SOON
            $orderObj->update_meta_data('baldar_status', 'Approved');
            $orderObj->update_meta_data('baldar_barcode', $response['DeliveryNumber']);
            $orderObj->save();
            $driver = explode(';', $response['DeliveryNumberString'])[1];
            $response = [
                'status' => 'Success',
                'barcodeId' => $response['DeliveryNumber'],
                'double' => $extraOptions['shippingtype'],
                'from' => $options['originComp'],
                'orderNum' => $wc['number'],
                'originAddr' => $options['originAddr'],
                'deliveryNumber' => $response['DeliveryNumber'],
                'originCity' => $options['originCity'],
                'originAddrNum' => $options['originAddrNum'],
                'driver' => $driver,
                'destAddr' => $options['destAddr'],
                'destAddrNum' => $options['destAddrNum'],
                'destCity' => $options['destCity'],
                'packageNum' => $extraOptions['numberofpackages'],
                'gov' => $options['gov'],
                'destComp' => $options['destComp'],
                'remarks' => $shippingRemarks,
                'globalRemarks' => get_option('remarks'),
                'phone' => $wc['billing']['phone']
            ];
        } else {
            $response = ['status' => 'Error', 'response' => $response];
        }
        echo json_encode($response);
    }
    wp_die();
}
function clean($string)
{
    return trim(preg_replace('/[.\/*!@#$%^&()_\-\~`\+\=\<\>,]/', '', $string)); // Removes special chars.
}
function sendPost($url, $data)
{
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));

    // In real life you should use something like:
    // curl_setopt($ch, CURLOPT_POSTFIELDS,
    //          http_build_query(array('postvar1' => 'value1')));

    // Receive server response ...
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $server_output = curl_exec($ch);

    curl_close($ch);

    return $server_output;
}



add_filter('plugins_api', 'check_plugin_info', 20, 3);
/*
 * $res empty at this step
 * $action 'plugin_information'
 * $args stdClass Object ( [slug] => woocommerce [is_ssl] => [fields] => Array ( [banners] => 1 [reviews] => 1 [downloaded] => [active_installs] => 1 ) [per_page] => 24 [locale] => en_US )
 */
function check_plugin_info($res, $action, $args)
{

    // do nothing if this is not about getting plugin information
    if ('plugin_information' !== $action) {
        return false;
    }

    $plugin_slug = 'yahav-baldar-integration'; // we are going to use it in many places in this function

    // do nothing if it is not our plugin
    if ($plugin_slug !== $args->slug) {
        return false;
    }

    // trying to get from cache first 
    // info.json is the file with the actual plugin information on your server
    $remote = wp_remote_get(
        'http://yahavlog.co.il/yahav-baldar-integration/update.json',
        array(
            'timeout' => 10,
            'headers' => array(
                'Accept' => 'application/json'
            )
        )
    );


    if (! is_wp_error($remote) && isset($remote['response']['code']) && $remote['response']['code'] == 200 && ! empty($remote['body'])) {

        $remote = json_decode($remote['body']);
        $res = new stdClass();

        $res->name = $remote->name;
        $res->slug = $plugin_slug;
        $res->version = $remote->version;
        $res->tested = $remote->tested;
        $res->requires = $remote->requires;
        $res->download_link = $remote->download_url;
        $res->trunk = $remote->download_url;
        $res->requires_php = $remote->requires_php;
        $res->last_updated = $remote->last_updated;
        $res->author = 'יהב לוגיסטיקה בע"מ';
        // $res->author_profile = 'https://profiles.wordpress.org/rudrastyh';

        // in case you want the screenshots tab, use the following HTML format for its content:
        // <ol><li><a href="IMG_URL" target="_blank"><img src="IMG_URL" alt="CAPTION" /></a><p>CAPTION</p></li></ol>
        return $res;
    }

    return false;
}

function baldar_push_update($transient)
{
    // Query premium/private repo for updates.
    if (empty($transient->checked)) {
        return $transient;
    }
    $update = baldar_check_for_updates();
    if ($update) {
        // Update is available.
        // $update should be an array containing all of the fields in $item below.
        $transient->response['yahav-baldar-integration/yahav-baldar-integration.php'] = $update;
    } else {
        // No update is available.
        $item = (object) array(
            'id'            => 'yahav-baldar-integration/yahav-baldar-integration.php',
            'slug'          => 'yahav-baldar-integration',
            'plugin'        => 'yahav-baldar-integration/yahav-baldar-integration.php',
            'new_version'   => VER,
            'url'           => '',
            'package'       => '',
            'icons'         => array(),
            'banners'       => array(),
            'banners_rtl'   => array(),
            'tested'        => '',
            'requires_php'  => '',
            'compatibility' => new stdClass(),
        );
        // Adding the "mock" item to the `no_update` property is required
        // for the enable/disable auto-updates links to correctly appear in UI.
        $transient->no_update['yahav-baldar-integration/yahav-baldar-integration.php'] = $item;
    }

    return $transient;
}

add_filter('pre_set_site_transient_update_plugins', 'baldar_push_update');



// add_filter('site_transient_update_plugins', 'baldar_push_update' );

function baldar_check_for_updates()
{
    // trying to get from cache first, to disable cache comment 10,20,21,22,24
    // if( false == $remote = get_transient( 'baldar_upgrade_yahav-baldar-integration' ) ) {

    // info.json is the file with the actual plugin information on your server
    $remote = wp_remote_get(
        'http://yahavlog.co.il/yahav-baldar-integration/update.json',
        array(
            'timeout' => 10,
            'headers' => array(
                'Accept' => 'application/json'
            )
        )
    );

    // 	if ( !is_wp_error( $remote ) && isset( $remote['response']['code'] ) && $remote['response']['code'] == 200 && !empty( $remote['body'] ) ) {
    // 		set_transient( 'baldar_upgrade_yahav-baldar-integration', $remote, 43200 ); // 12 hours cache
    // 	}

    // }

    if ($remote) {

        $remote = json_decode($remote['body']);

        // your installed plugin version should be on the line below! You can obtain it dynamically of course 
        if ($remote && version_compare(VER, $remote->version, '<') && version_compare($remote->requires, get_bloginfo('version'), '<')) {
            $res = (object) array(
                'id'            => 'yahav-baldar-integration/yahav-baldar-integration.php',
                'slug'          => 'yahav-baldar-integration',
                'plugin'        => 'yahav-baldar-integration/yahav-baldar-integration.php',
                'new_version'   => $remote->version,
                'url'           => '',
                'package'       => $remote->download_url,
                'icons'         => array(),
                'banners'       => array(),
                'banners_rtl'   => array(),
                'tested'        => $remote->tested,
                'requires_php'  => $remote->requires_php,
                'compatibility' => new stdClass(),
            );
            return $res;
            //$transient->checked[$res->plugin] = $remote->version;
        }
    }
    return false;
}

if (is_hpos_enabled()) { // Use HPOS-compatible hooks
    add_filter('manage_woocommerce_page_wc-orders_columns', 'yahav_order_actions_column');
    add_filter('manage_woocommerce_page_wc-orders_custom_column', 'yahav_order_actions_column_data', 10, 2);
} else { // Use legacy WooCommerce hooks
    add_filter('manage_edit-shop_order_columns', 'yahav_order_actions_column', 20);
    add_action('manage_shop_order_posts_custom_column', 'yahav_order_actions_column_data', 10, 2);
}
function yahav_order_actions_column($columns)
{

    $reordered_columns = array();

    // Inserting columns to a specific location
    foreach ($columns as $key => $column) {
        if ($key ==  'order_total') {
            $reordered_columns['yahav_product_actions'] = 'יהב בלדר';
        }
        $reordered_columns[$key] = $column;
    }

    return $reordered_columns;
}

function yahav_order_actions_column_data($column,$postOrPostId)
{
    if ($column == 'yahav_product_actions') {
        if(is_int($postOrPostId)) $order_id = $postOrPostId;
        else $order_id = $postOrPostId->ID;
        $orderObj = wc_get_order($order_id);
        $status = $orderObj->get_meta("baldar_status");
        if (in_array($status, ["", "Waiting"])) {
            $paymentMethod = $orderObj->get_payment_method();
            $gov = 0;
            if ($paymentMethod == "cod") {
                $gov = $orderObj->get_total();
            }
    ?>
            <button class="acceptOrderInOrdersPage yahav-button small" data-orderid="<?= $order_id ?>"><i class="dashicons-before dashicons-yes"></i></button>
            <button class="declineOrderInOrdersPage yahav-button small red" data-orderid="<?php echo $order_id; ?>"><i class="dashicons-before dashicons-no"></i></button>
            <button class="orderOptions yahav-button small gray" data-orderid="<?php echo $order_id; ?>"><i class="dashicons-before dashicons-admin-generic"></i></button>
            <input type="hidden" name="shippingtype" value="normal">
            <input type="hidden" name="gov" value="<?= $gov ?>">
            <input type="hidden" name="transporttype" value="car">
            <input type="hidden" name="numberofpackages" value="1">
            <input type="hidden" name="remarks" value="">

        <?php
        } elseif ($status == "Approved") {
        ?>
            <div class="yahav-orders-page-success">
                <p class="success-text">מספר עסקה בבלדר: <b><?= $orderObj->get_meta("baldar_barcode"); ?></b></p>
            </div>
        <?php
        } elseif ($status == "Denied") {
        ?>
            <div class="yahav-orders-page-denied">
                <p class="denied-text">עסקה זו לא הוכנסה לבלדר</p>
            </div>
        <?php
        }
    }
}

// 

add_action('add_meta_boxes', 'add_yahav_order_actions_meta_box');
function add_yahav_order_actions_meta_box()
{
    $screen = is_hpos_enabled()
        ? wc_get_page_screen_id('shop-order')
        : 'shop_order';

    add_meta_box('add_yahav_order_actions_meta_box', "אפשרויות יהב בלדר", 'add_yahav_order_actions_meta_box_html', $screen, 'side', 'high');
}

function add_yahav_order_actions_meta_box_html($object)
{
    global $post;

    $orderObj = is_a($object, 'WP_Post') ? wc_get_order($object->ID) : $object;
    $order_id = $orderObj->ID;
    $status = $orderObj->get_meta("baldar_status");
    if (in_array($status, ["", "Waiting"])) {
        $paymentMethod = $orderObj->get_payment_method();
        $gov = 0;
        if ($paymentMethod == "cod") {
            $gov = $orderObj->get_total();
        }
        ?>
        <button class="acceptOrderInOrdersPage singleOrderPage yahav-button small" data-orderid="<?= $order_id ?>"><i class="dashicons-before dashicons-yes"></i></button>
        <button class="declineOrderInOrdersPage singleOrderPage yahav-button small red" data-orderid="<?php echo $order_id; ?>"><i class="dashicons-before dashicons-no"></i></button>
        <button class="orderOptions singleOrderPage yahav-button small gray" data-orderid="<?php echo $order_id; ?>"><i class="dashicons-before dashicons-admin-generic"></i></button>
        <input type="hidden" name="shippingtype" value="normal">
        <input type="hidden" name="gov" value="<?= $gov ?>">
        <input type="hidden" name="transporttype" value="car">
        <input type="hidden" name="numberofpackages" value="1">
        <input type="hidden" name="remarks" value="">

    <?php
    } elseif ($status == "Approved") {
    ?>
        <div class="yahav-orders-page-success">
            <p class="success-text">מספר עסקה בבלדר: <b><?= $orderObj->get_meta("baldar_barcode") ?></b></p>
        </div>
    <?php
    } elseif ($status == "Denied") {
    ?>
        <div class="yahav-orders-page-denied">
            <p class="denied-text">עסקה זו לא הוכנסה לבלדר</p>
        </div>
<?php
    }
}

// add_action( 'save_post', 'mv_save_wc_order_other_fields', 10, 1 );
// if ( ! function_exists( 'mv_save_wc_order_other_fields' ) )
// {

//     function mv_save_wc_order_other_fields( $post_id ) {

//         // We need to verify this with the proper authorization (security stuff).

//         // Check if our nonce is set.
//         if ( ! isset( $_POST[ 'mv_other_meta_field_nonce' ] ) ) {
//             return $post_id;
//         }
//         $nonce = $_REQUEST[ 'mv_other_meta_field_nonce' ];

//         //Verify that the nonce is valid.
//         if ( ! wp_verify_nonce( $nonce ) ) {
//             return $post_id;
//         }

//         // If this is an autosave, our form has not been submitted, so we don't want to do anything.
//         if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
//             return $post_id;
//         }

//         // Check the user's permissions.
//         if ( 'page' == $_POST[ 'post_type' ] ) {

//             if ( ! current_user_can( 'edit_page', $post_id ) ) {
//                 return $post_id;
//             }
//         } else {

//             if ( ! current_user_can( 'edit_post', $post_id ) ) {
//                 return $post_id;
//             }
//         }
//         // --- Its safe for us to save the data ! --- //

//         // Sanitize user input  and update the meta field in the database.
//         update_post_meta( $post_id, '_my_field_slug', $_POST[ 'my_field_name' ] );
//     }
// }

function is_hpos_enabled()
{
    // Check if HPOS is available and enabled
    if (class_exists('\Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController')) {
        $controller = wc_get_container()->get(\Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController::class);
        return $controller->custom_orders_table_usage_is_enabled();
    }
    return false;
}

function getOrderDataBillingOrShippingDetailsByUserSettings($wc){
        if (!empty($wc['shipping']['first_name']) || !empty($wc['shipping']['last_name'])) {
            $personName = $wc['shipping']['first_name'] . ' ' . $wc['shipping']['last_name'];
        } elseif (!empty($wc['billing']['first_name']) || !empty($wc['billing']['last_name'])) {
            $personName = $wc['billing']['first_name'] . ' ' . $wc['billing']['last_name'];
        }

        if (get_option('shipping_field') == 'shipping') {
            $destAddr = $wc['shipping']['address_1'];
            $destAddrNum = $wc['shipping']['address_2'];
            $destCity = $wc['shipping']['city'];
            $destPhone = $wc['shipping']['phone'];
        } elseif (get_option('shipping_field') == 'billing') {
            $destAddr = $wc['billing']['address_1'];
            $destAddrNum = $wc['billing']['address_2'];
            $destCity = $wc['billing']['city'];
            $destPhone = $wc['billing']['phone'];
        } else {
            $destAddr = !empty($wc['shipping']['address_1']) ? $wc['shipping']['address_1'] : $wc['billing']['address_1'];
            $destAddrNum = !empty($wc['shipping']['address_2']) ? $wc['shipping']['address_2'] : $wc['billing']['address_2'];
            $destCity = !empty($wc['shipping']['city']) ? $wc['shipping']['city'] : $wc['billing']['city'];
            $destPhone = !empty($wc['shipping']['phone']) ? $wc['shipping']['phone'] : $wc['billing']['phone'];
        }

        $email = $wc['billing']['email'];

        return [$personName, $destAddr, $destAddrNum, $destCity, $destPhone, $email];
}

function admin_only_proxy() {
    // Check if the current user is an administrator
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => 'Access denied.'], 403);
        return;
    }

    // Get the target URL from the request
    $target_url = isset($_GET['url']) ? esc_url_raw($_GET['url']) : '';

    if (!$target_url) {
        wp_send_json_error(['message' => 'No URL specified.'], 400);
        return;
    }

    // Fetch the resource
    $response = wp_remote_get($target_url);

    if (is_wp_error($response)) {
        wp_send_json_error(['message' => $response->get_error_message()], 500);
        return;
    }

    $body = wp_remote_retrieve_body($response);
    $content_type = wp_remote_retrieve_header($response, 'content-type');

    // Output the response with appropriate headers
    header('Content-Type: ' . ($content_type ?: 'application/octet-stream'));
    echo $body;
    exit;
}

// Register the AJAX action for logged-in users
add_action('wp_ajax_admin_proxy', 'admin_only_proxy');

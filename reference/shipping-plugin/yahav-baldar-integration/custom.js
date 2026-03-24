(function ($) {
	$(".acceptOrder").click(function () {
		var orderid = $(this).data("orderid"),
			buttonElem = $(this),
			remarks = $(this).closest("tr").find(".orderRemarks").val(),
			extraOptionsInputs = $(this).closest("tr").find('.column-options input[type="hidden"]'),
			extraOptions = {};
		$.each(extraOptionsInputs, function (index, option) {
			extraOptions[$(option).attr("name")] = $(option).val();
		});
		$(".loader-modal").css("display", "flex");
		$.ajax({
			type: "POST",
			url: ajaxurl,
			data: { action: "accept_baldar", orderid, remarks, extraOptions },
			dataType: "json",
			success: function (response) {
				console.log(response);
				if (response["status"] == "Success") {
					var originAddr = response["originAddr"] + " " + response["originAddrNum"] + " " + response["originCity"];
					var destAddr = response["destAddr"] + " " + response["destAddrNum"] + " " + response["destCity"];
					var double = response["double"] == "double" ? "רגיל/כפול רגיל" : "רגיל";
					$("#message-div-baldar").html('<h3 class = "general-message success">עסקה מספר ' + orderid + " אושרה בהצלחה</h3>");
					// NEXT UPDATE
					buttonElem.closest("td").html(
						`<input data-originaddr = "` +
							originAddr +
							`"
                    data-destaddr = "` +
							destAddr +
							`"
                    data-double = "` +
							double +
							`"
                    data-ordernum = "` +
							response["orderNum"] +
							`"
                    data-gov = "` +
							response["gov"] +
							`"
                    data-from = "` +
							response["from"].replace('"', "&quot;") +
							`"
                    data-to = "` +
							response["destComp"] +
							`"
                    data-driver = "` +
							response["driver"] +
							`"
                    data-packagenum = "` +
							response["packageNum"] +
							`"
                    data-phone = "` +
							response["phone"] +
							`"
                    data-orderremarks = "` +
							response["remarks"] +
							`"
                    data-globalremarks = "` +
							response["globalRemarks"] +
							`"
                    value = "` +
							response["barcodeId"] +
							`"
                    type="checkbox" name="barcode-generate">
                    <label for="barcode-generate">הוסף לרשימת ההדפסה של הברקודים</label>`
					);
					buttonElem.closest("tr").remove();
					$("#select-all-baldar-page-print-checkboxes").show();
				} else {
					$("#message-div-baldar").html(`<h3 class = "general-message error">${response.response}</h3>`);
				}
			},
			complete: function (response) {
				$(".loader-modal").hide();
			},
		});
	});

	$(".acceptOrderInOrdersPage").click(function (e) {
		e.preventDefault();

		var orderid = $(this).data("orderid"),
			buttonElem = $(this),
			isInOrderPage = buttonElem.hasClass("singleOrderPage"),
			extraOptionsInputs = $(this)
				.closest(!isInOrderPage ? "td" : "#add_yahav_order_actions_meta_box .inside")
				.find('input[type="hidden"]'),
			extraOptions = {},
			remarks = "";
		$.each(extraOptionsInputs, function (index, option) {
			if ($(option).attr("name") == "remarks") remarks = $(option).val();
			else extraOptions[$(option).attr("name")] = $(option).val();
		});
		$(".loader-modal").css("display", "flex");
		$.ajax({
			type: "POST",
			url: ajaxurl,
			data: { action: "accept_baldar", orderid, remarks, extraOptions },
			dataType: "json",
			success: function (response) {
				console.log(response);
				if (response["status"] == "Success") {
					var originAddr = response["originAddr"] + " " + response["originAddrNum"] + " " + response["originCity"];
					var destAddr = response["destAddr"] + " " + response["destAddrNum"] + " " + response["destCity"];
					var double = response["double"] == "double" ? "רגיל/כפול רגיל" : "רגיל";
					$("#message-div-baldar").html('<h3 class = "general-message success">עסקה מספר ' + orderid + " אושרה בהצלחה</h3>");
					// NEXT UPDATE
					buttonElem.closest(!isInOrderPage ? "td" : "#add_yahav_order_actions_meta_box .inside").html(
						`
                  <div class="yahav-orders-page-success">
                  <p class="success-text">הצלחה! מספר עסקה: <b>${response.deliveryNumber}</b></p>
                  <div class="yahav-orders-page-print-checkbox">
                  <input data-originaddr = "` +
							originAddr +
							`"
                    data-destaddr = "` +
							destAddr +
							`"
                    data-double = "` +
							double +
							`"
                    data-ordernum = "` +
							response["orderNum"] +
							`"
                    data-gov = "` +
							response["gov"] +
							`"
                    data-from = "` +
							response["from"].replace('"', "&quot;") +
							`"
                    data-to = "` +
							response["destComp"] +
							`"
                    data-driver = "` +
							response["driver"] +
							`"
                    data-packagenum = "` +
							response["packageNum"] +
							`"
                    data-phone = "` +
							response["phone"] +
							`"
                    data-orderremarks = "` +
							response["remarks"] +
							`"
                    data-globalremarks = "` +
							response["globalRemarks"] +
							`"
                    value = "` +
							response["barcodeId"] +
							`"
                    type="checkbox" name="barcode-generate">
                    <label for="barcode-generate">הוסף לרשימת ההדפסה של הברקודים</label>
                    </div>`
					);
				} else {
					//  $('#message-div-baldar').html(`<h3 class = "general-message error">${response.response}</h3>`);
					alert("קרתה שגיאה באישור המשלוח. יש לפנות לתמיכה של יהב לוגיסטיקה");
				}
			},
			complete: function (response) {
				$(".loader-modal").hide();
			},
		});
	});

	$(".column-yahav_product_actions").click(function (e) {
		e.stopPropagation();
	});
	$(".declineOrder").click(function () {
		var orderid = $(this).data("orderid"),
			buttonElem = $(this);
		$(".loader-modal").css("display", "flex");
		$.ajax({
			type: "POST",
			url: ajaxurl,
			data: { action: "deny_baldar", orderid },
			dataType: "json",
			success: function (response) {
				console.log(response);
				if (response["status"] == "Success") {
					$("#message-div-baldar").html('<h3 class = "general-message success">עסקה מספר ' + orderid + " בוטלה בהצלחה</h3>");
					buttonElem.closest("tr").remove();
				}
			},
			complete: function (response) {
				$(".loader-modal").hide();
			},
		});
	});
	$(".declineOrderInOrdersPage").click(function (e) {
		e.preventDefault();
		var orderid = $(this).data("orderid"),
			buttonElem = $(this),
			isInOrderPage = buttonElem.hasClass("singleOrderPage");
		$(".loader-modal").css("display", "flex");
		$.ajax({
			type: "POST",
			url: ajaxurl,
			data: { action: "deny_baldar", orderid },
			dataType: "json",
			success: function (response) {
				console.log(response);
				if (response["status"] == "Success") {
					buttonElem.closest(!isInOrderPage ? "td" : "#add_yahav_order_actions_meta_box .inside").html(`
                  <div class="yahav-orders-page-denied">
                  <p class="denied-text">עסקה זו לא הוכנסה לבלדר</p>
                  </div>`);
				}
			},
			complete: function (response) {
				$(".loader-modal").hide();
			},
		});
	});
	// NEXT UPDATE
	$("#add_yahav_order_actions_meta_box .inside,.toplevel_page_yahav_main_slug,.column-yahav_product_actions").on(
		"change",
		'input[name="barcode-generate"]',
		function () {
			if ($('input[name="barcode-generate"]:checked').length > 0) {
				$("#print-barcodes").show();
			} else $("#print-barcodes").hide();
		}
	);
	$("#print-barcodes").click(async function () {
		if ($('input[name="barcode-generate"]:checked').length > 0) {
			$(".loader-modal").css("display", "flex");
			// alert('hey');
			var printElem = $("#print_element #print_element_container");
			printElem.html("");
			// var printarr = [];
			// $('.loader-modal').css('display','flex');
			for (valueOfElement of $('input[name="barcode-generate"]:checked')) {
				var barcodeId = $(valueOfElement).val();
				var originAddr = $(valueOfElement).attr("data-originaddr");
				var destAddr = $(valueOfElement).attr("data-destaddr");
				var double = $(valueOfElement).attr("data-double");
				var orderNum = $(valueOfElement).attr("data-ordernum");
				var gov = $(valueOfElement).attr("data-gov");
				var from = $(valueOfElement).attr("data-from");
				var to = $(valueOfElement).attr("data-to");
				var driver = $(valueOfElement).attr("data-driver");
				var packageNum = $(valueOfElement).attr("data-packagenum");
				var phone = $(valueOfElement).attr("data-phone");
				var orderRemarks = $(valueOfElement).attr("data-orderremarks");
				//  var globalRemarks = $(valueOfElement).attr('data-globalremarks');
				//  var remarks;
				//  var seperator = "|";
				//  if(globalRemarks.trim() == "" || orderRemarks.trim() == "")
				//   seperator = "";
				//  remarks = globalRemarks+seperator+orderRemarks;
				packageNum = parseInt(packageNum);
				for (var i = 1; i <= packageNum; i++) {
					var sticker = $("<div />");
					sticker
						.append(
							`<img src = '' class = "sticker-barcode-image">`
						)
						.append(
							`
     <table>
     <tbody>  
     <tr>
     <td>מאת: ` +
								from +
								`</td>
     <td>` +
								orderNum +
								`</td>
     </tr>
     <tr>
     <td>` +
								originAddr +
								`</td>
     <td>` +
								i +
								` -מ- ` +
								packageNum +
								`</td>
     </tr>
     <tr>
     <td><b>עבור: ` +
								to +
								`</b></td>
     <td><b>` +
								driver +
								`</b></td>
     </tr>
     <tr>
     <td><b>` +
								destAddr +
								`</b></td>
     <td><b>` +
								gov +
								`</b>  </td>
     </tr>
     <tr>
     <td>` +
								phone +
								`</td>
     <td><b>` +
								double +
								`</b></td>
     </tr>
     </tr>
     <tr>
     <td colspan = "2" class = "smaller">
     <div>
     מ:` +
								originAddr +
								` כרמיאל ל:` +
								destAddr +
								` ::` +
								orderRemarks +
								`
     </div>
     </td>
     </tr>
     </tbody>
     </table>`
						);
					printElem.append(sticker);
					await JsBarcode(sticker.find('.sticker-barcode-image').get(0), barcodeId, {
						flat: false,
						height: 175,
						fontSize: 45,
						margin:0,
						marginBottom: 10,
						textMargin: 0,
						width: 5,
					});
				}
			}
			//   $.ajax({
			//     type: "POST",
			//     url: ajaxurl,
			//     data: {action:'baldar_details',printarr},
			//     dataType: "json",
			//     success: function (response) {
			//         console.log(response);
			//     },
			//     complete: function(response){
			//     },
			//     error:function(){
			//       $('.loader-modal').hide();
			//     }
			// });
			printElem.css("display", "flex");
			let stickersCss = `
      #print_element_container{display:flex; flex-wrap:wrap; margin:0; width:100%;}
      #print_element_container > div{
	  ${extraParams.sticker_print_mode == "multiple-in-a4-page"?"height:calc(25vh);":""}
	  width:${extraParams.sticker_print_mode == "multiple-in-a4-page"?"50%":"390px"};
        flex:0 0 auto; align-items:center;
        justify-content:center;
        padding:10px; display:inline-flex;
        flex-direction:column; box-sizing:border-box;}
      #print_element_container img{width:100%; object-fit:contain; height:80px}
#print_element_container table, #print_element_container th, #print_element_container td {
  border: 1px solid black;
}
#print_element_container table tr > td:nth-child(2)
{
text-align:center;
}
#print_element_container table {
  border-collapse: collapse;
  width: 100%;
}

#print_element_container th, #print_element_container td {
  padding: 4px;
  color: black;
}
      #print_element_container, #print_element_container *{
        direction:rtl;
        font-family:sans-serif;
        font-size:14px;
      }
      #print_element_container td.smaller div{
     	  ${extraParams.sticker_print_mode == "multiple-in-a4-page"?"height:calc(2em + 4px);":""}   
        overflow:hidden;
        font-size:11px;
		line-height: 1.1em;
      }

	  #print_element{
	  ${extraParams.sticker_print_mode == "single-in-seperate-page"?`
		width: 0;
  height: 0;
  overflow: hidden;	
		`:""}   
	}
      `;
			if (extraParams.sticker_print_mode == "single-in-seperate-page") {
				printElem.append(`<style>${stickersCss}</style>`);
				const doc = new jspdf.jsPDF({
					orientation: "landscape", // Use "landscape" if needed
					unit: "in",
					format: [2.81, 3.94] // Custom page size in inches				  
				});
            // Get PDF page dimensions
				const pageWidth = doc.internal.pageSize.getWidth();
				const pageHeight = doc.internal.pageSize.getHeight();

				const stickers = $("#print_element_container > div");
				let i = 0;
				for (sticker of stickers) {
					let image = await htmlToImage.toJpeg(sticker, {
						quality: 1,
						includeQueryParams: true,
						pixelRatio: 2,
						backgroundColor: "white",
						fetchRequestInit: {
							cache: "no-cache",
						},
					});
					
					const img = new Image();
					img.src = image;
					let imageParams = await new Promise((resolve) => {
						img.onload = () => {
							const imgWidth = img.width;
							const imgHeight = img.height;
		
							// Calculate scaled dimensions to fit within the page
							const scaleFactor = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
							const scaledWidth = imgWidth * scaleFactor;
							const scaledHeight = imgHeight * scaleFactor;
		
							// Center the image on the page
							const xOffset = (pageWidth - scaledWidth) / 2;
							const yOffset = (pageHeight - scaledHeight) / 2;
		
							resolve({xOffset, yOffset, scaledWidth, scaledHeight});
						};
					});
		

					doc.addImage(image, "JPEG", imageParams.xOffset, imageParams.yOffset, imageParams.scaledWidth, imageParams.scaledHeight);
					if(i!=stickers.length-1) doc.addPage();
					// Render the table into the PDF
					// doc.html(table, {
					// 	callback: function (doc) {
					// 		// Add a new page for the next table, if there is one
					// 		if (index < tables.length - 1) {
					// 			doc.addPage();
					// 		}
					// 		// Save the PDF after rendering the last table
					// 		if (index === tables.length - 1) {
					// 			doc.save("tables.pdf");
					// 		}
					// 	},
					// 	x: 10,
					// 	y: 10,
					// });
					i++;
				}
				const pdfBlob = doc.output("blob");
				const pdfUrl = URL.createObjectURL(pdfBlob);
			    window.open(pdfUrl, "_blank");
			} else {
				stickersCss += `@page 
      {
          size:  A4;   /* auto is the initial value */
          margin-top:0;
          margin-bottom:0;
          margin-left: 0;
          margin-right: 0;
      }`;
				printJS({
					printable: "print_element",
					type: "html",
					style: stickersCss,
				});
			}
			printElem.hide();
			$(".loader-modal").hide();
		}
	});
	// initalise the dialog
	$(".extra-options").dialog({
		title: "אפשרויות נוספות",
		dialogClass: "wp-dialog extra-options-yahav",
		autoOpen: false,
		draggable: false,
		width: "auto",
		modal: true,
		resizable: false,
		closeOnEscape: true,
		position: {
			my: "center",
			at: "center",
			of: window,
		},
		open: function () {
			// close dialog by clicking the overlay behind it
			$(".ui-widget-overlay").bind("click", function () {
				$(".extra-options").dialog("close");
			});
		},
		create: function () {
			// style fix for WordPress admin
			$(".ui-dialog-titlebar-close").addClass("ui-button");
		},
	});

	// bind a button or a link to open the dialog
	$(".orderOptions").click(function (e) {
		e.preventDefault();
		var button = $(this),
			orderId = button.attr("data-orderid");
		setOptionsDialogFields(orderId);
		$(".extra-options").dialog("open");
	});

	$(".extra-options form").submit(function (e) {
		e.preventDefault();
		var orderId = $(this).attr("data-extra-submit"),
			fields = $(".extra-options .order-field"),
			orderOptionsButton = $(".orderOptions[data-orderid=" + orderId + "]"),
			isInOrderPage = orderOptionsButton.hasClass("singleOrderPage");

		$.each(fields, function (index, field) {
			var fieldName = $(field).attr("name").split("-")[0];
			orderOptionsButton
				.closest(!isInOrderPage ? "td" : "#add_yahav_order_actions_meta_box .inside")
				.find('input[name="' + fieldName + '"]')
				.val($(field).val());
			// dialog.find('.order-field[name='+$(field).attr('name')+'-fill]').val($(field).val());
		});
		$(".extra-options").dialog("close");
	});

	var setOptionsDialogFields = function (id) {
		var dialog = $(".extra-options"),
			orderOptionsButton = $(".orderOptions[data-orderid=" + id + "]");
		dialog.find("form").attr("data-extra-submit", id),
			(isInOrderPage = orderOptionsButton.hasClass("singleOrderPage")),
			(hiddenFields = orderOptionsButton.closest(!isInOrderPage ? "td" : "#add_yahav_order_actions_meta_box .inside").find('input[type="hidden"]'));
		$.each(hiddenFields, function (index, field) {
			// console.log($(field).val());
			dialog.find(".order-field[name=" + $(field).attr("name") + "-fill]").val($(field).val());
		});
	};

	$("#accept-all-baldar-orders").on("click", function () {
		$('#yahav-baldar-main-table tbody .check-column input[type="checkbox"]:checked').each(function (i, elem) {
			elem = $(elem);
			let acceptOrderInsideRow = elem.closest("tr").find(".acceptOrder");
			if (acceptOrderInsideRow.length) acceptOrderInsideRow.click();
		});
	});

	$("#select-all-baldar-page-print-checkboxes").on("click", function () {
		$('#yahav-baldar-main-table tbody input[type="checkbox"][name="barcode-generate"]').each(function (i, elem) {
			elem = $(elem);
			elem.prop("checked", true).change();
		});
	});

	$('#yahav-baldar-main-table thead .check-column input[type="checkbox"], #yahav-baldar-main-table tbody .check-column input[type="checkbox"]').on(
		"change",
		function () {
			if ($('#yahav-baldar-main-table tbody .check-column input[type="checkbox"]:checked').length > 0) $("#accept-all-baldar-orders").show();
			else $("#accept-all-baldar-orders").hide();
		}
	);

	$(document).on("change", '.wp-list-table tbody .check-column input[type="checkbox"]', function () {
		let isChecked = $(this).is(":checked");
		let orderId = $(this).val();
		console.log(`Order ID ${orderId} is ${isChecked ? "selected" : "deselected"}`);
		// You can handle additional logic here
	});

	const getBase64FromUrl = async (url, extraOpts = {}) => {
		const data = await fetch(url, extraOpts);
		const blob = await data.blob();
		const result = await blobToBase64(blob);
		return result;
	};

	function blobToBase64(blob) {
		return new Promise((resolve, _) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result);
			reader.readAsDataURL(blob);
		});
	}
})(jQuery);

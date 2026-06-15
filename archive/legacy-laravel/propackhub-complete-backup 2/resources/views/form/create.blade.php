@extends('layouts.custom')

@section('content')

<section class="hero-one">

        <div class="container-fluid">
            <div class="top-btns d-flex justify-content-center mb-3">
                
                <button class="btn btn-save btn-before" form="mainForm" type="submit">Save</button>
                <a href="{{ route('forms.create')}}" class="btn btn-reset btn-before">Reset Project</a>

            </div>
            @if(session('success'))
                <div class="alert alert-success">
                    {{ session('success') }}
                </div>
            @endif

            @if(session('error'))
                <div class="alert alert-danger">
                    {{ session('error') }}
                </div>
            @endif

            <h2 class="title text-center">Flexible Packaging <br>Cost & Materials Estimation Vs Actual</h2>

            <div class="form_one customer-name"> 
                
            <div class="form-group ">
                <label for="customerName" class="form-label">Customer Name</label>
                <input type="text" class="form-control " form="mainForm" id="customerName" name="customerName">
            </div>

            <div class="form-group job-name">
                <label for="jobName" class="form-label">Job Name</label>
                <input type="text" class="form-control" form="mainForm" id="jobName" name="jobName" >
            </div>

            <div class="form-group product-type">
                <label for="productType" class="form-label">Product Type</label>
                <select class="form-select form-control" form="mainForm" id="productType" name="productType" >
                    <option value="roll" selected>Roll</option>
                    <option value="sleeve">Sleeve</option>
                    <option value="bag-pouch">Bag/Pouch</option>
                </select>
            </div>

            <div class="form-group product-number">
                    <label for="projectNumber" class="form-label">Project Number</label>
                    <input type="text" class="form-control"  form="mainForm" id="projectNumber" name="projectNumber" style="text-align: center;">
            </div>

            <div class="form-group order-quantity">
                <label for="orderQuantity" class="form-label">Order Quantity</label>
                <div class="input-group">
                    <input type="text" class="form-control orderQuantity" form="mainForm" id="orderQuantity" name="orderQuantity" oninput="formatNumberWithCommas(this)">
                    <select class="form-select units" id="units" form="mainForm" name="units">
                        <option value="kgs" selected>Kgs</option>
                        <option value="kpcs">Kpcs</option>
                        <option value="sqm">SQM</option>
                        <option value="lm">LM</option>
                        <option value="Roll 500 LM">Roll 500 LM</option>

                        
                    </select>
                </div>
            </div>

            <div class="form-group date-pick">
                <label for="datePick" class="form-label">Date</label>
                <input type="date" class="form-control dateInput" form="mainForm" id="project_date" name="project_date" required>
            </div>
            
</div>
        </div>
        
        </div>
    </section>

    <section style="background: #EEF8FF;" class="py-4 mt-3">
        <div class="container-fluid">

            <!-- Roll Table -->
            <div class="table-responsive result-tables roll-table" id="roll-table">
                <table class="table table-bordered myTable">
                    <thead>
                        <tr>
                            <th colspan="2">Roll Dimensions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Reel Width (mm)</td>
                            <td class="has-input blue-field"><input id="roll-real-width" form="mainForm" oninput="validateDecimalInput(this)" name="roll-real-width" type="number"  class="roll-real-width"></td>
                        </tr>
                        <tr>
                            <td>Cut Off (mm)</td>
                            <td class="has-input blue-field"><input id="roll-cut-off" oninput="validateDecimalInput(this)" form="mainForm" name="roll-cut-off" type="number"  class="roll-cut-off"></td>
                        </tr>
                         <tr>
                            <td>Extra Printing Trim (mm)</td>
                            <td class="has-input blue-field"><input id="roll-extra-printing-trim" form="mainForm" name="roll-extra-printing-trim" type="number"  class="roll-extra-printing-trim"></td>
                        </tr>
                        <tr>
                            <td>Pieces per Cut</td>
                            <td class="has-input blue-field"><input form="mainForm" name="roll-pieces-per-cut" id="roll-pieces-per-cut" type="number"  class="roll-pieces-per-cut"></td>
                        </tr>
                        <tr>
                            <td>Number Of Ups</td>
                            <td class="has-input blue-field"><input name="numberOfUpsRoll" form="mainForm" id="numberOfUpsRoll" type="number"  class="numberOfUpsRoll"></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Sleeve Table -->
            <div class="table-responsive result-tables sleeve-table"  id="sleeve-table" style="display: none;">
                <table class="table table-bordered myTable">
                    <thead>
                        <tr>
                            <th colspan="2">Sleeve Dimensions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Lay Flat (mm)</td>
                            <td class="has-input blue-field"><input name="lay-flat-value" oninput="validateDecimalInput(this)"  form="mainForm" id="lay-flat-value" type="number" class="lay-flat-value "></td>
                        </tr>
                        <tr>
                            <td>Reel Width (mm)</td>
                            <td class="has-input blue-field"><input type="number" form="mainForm" oninput="validateDecimalInput(this)"  id="real-width-value" name="real-width-value"   class="real-width-value "></td>
                        </tr>
                        <tr>
                            <td>Cut Off (mm)</td>
                            <td class="has-input blue-field"><input name="cut-off-value" oninput="validateDecimalInput(this)"  form="mainForm" id="cut-off-value" type="number"  class="cut-off-value "></td>
                        </tr>
                        <tr>
                            <td>Extra Printing Trim (mm)</td>
                            <td class="has-input blue-field"><input type="number" form="mainForm"  name="extra-printing-trim-value" id="extra-printing-trim-value" class="extra-printing-trim-value "></td>
                        </tr>
                        <tr>
                            <td>Number Of Ups</td>
                            <td class="has-input blue-field"><input type="number" form="mainForm"  id="number-of-ups-value" name="number-of-ups-value" class="number-of-ups-value"></td>
                        </tr>
                        
                    </tbody>
                </table>
            </div>

            <!-- Bag/Pouch Table -->
            <div class="pouch-zipper-table pouch-table" id="pouch-table" style="display: none;">
                <!-- Pouch Table -->
                <div class="table-responsive result-tables pouch-table">
                    <table class="table table-bordered myTable">
                        <thead>
                            <tr>
                                <th colspan="2">Pouch Dimensions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Open Height (F+G+B) (mm)</td>
                                <td class="has-input blue-field"><input type="number"  form="mainForm" name="open-height" id="open-height" class="open-height" oninput="validateDecimalInput(this)"></td>
                            </tr>
                            <tr>
                                <td>Open Width (with Gusset) (mm)</td>
                                <td class="has-input blue-field"><input type="number"  form="mainForm" name="open-width" id="open-width" class="open-width" oninput="validateDecimalInput(this)"></td>
                            </tr>
                            <tr>
                                <td>Extra Printing Trim (mm)</td>
                                <td class="has-input blue-field"><input type="number"  form="mainForm" name="extra-printing-trim" id="extra-printing-trim" class="extra-printing-trim"></td>
                            </tr>
                            <tr>
                                <td>Number Of Ups</td>
                                <td class="has-input blue-field"><input type="number"  form="mainForm" name="no_of_ups" id="no_of_ups" class="no_of_ups"></td>
                            </tr>
                            
                        </tbody>
                    </table>
                </div>

                <!-- Zipper Table -->
                <div class="table-responsive result-tables zipper-table">
                    <table class="table table-bordered myTable">
                        <thead>
                            <tr>
                                <th colspan="2">Zipper Calculations</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Weight of 1 Meter Zipper (gr)</td>
                                <td class="has-input"><input type="number" form="mainForm" name="weight-of-one-meter-zip" id="weight-of-one-meter-zip" class="weight-of-one-meter-zip blue-field" oninput="validateDecimalInput(this)"></td>
                            </tr>
                            <tr>
                                <td>Cost of 1 Meter Zipper</td>
                                <td class="has-input"><input type="number" form="mainForm"  name="cost-one-meter-zipper" id="cost-one-meter-zipper" class="cost-one-meter-zipper blue-field"></td>
                            </tr>
                            <tr>
                                <td>Cost of 1 gr Zipper</td>
                                <td class="has-input"><input type="number" value="0.000" form="mainForm" name="cost-one-gr-zipper" id="cost-one-gr-zipper" class="cost-one-gr-zipper" readonly></td>
                            </tr>
                            <tr>
                                <td>Zipper Weight per Pouch (gr)</td>
                                <td class="has-input "><input type="number" value="0.00" form="mainForm" name="zipper-weight-per-pouch" id="zipper-weight-per-pouch" class="zipper-weight-per-pouch" oninput="validateDecimalInput(this)" readonly></td>
                            </tr>
                            <tr>
                                <td>Zipper Cost per Pouch</td>
                                <td class="has-input "><input type="number" value="0.000" form="mainForm" class="zipper-cost-per-pouch" id="zipper-cost-per-pouch" name="zipper-cost-per-pouch" readonly></td>
                            </tr>
                            <tr>
                                <td>Zipper Cost 1 kg</td>
                                <td class="has-input "><input type="number" value="0.000" form="mainForm" name="zipper-cost-one-kg" id="zipper-cost-one-kg" class="zipper-cost-one-kg" readonly></td>
                            </tr>
                            <tr>
                                <td>Quantity Required of Zippers (Mtr / Kgs)</td>
                                <td class="has-input has-two-input"><input type="text" form="mainForm" name="quantity-req-zipper-one" id="quantity-req-zipper-one" class="quantity-req-zipper-one" readonly><input name="quantity-req-zipper-two" form="mainForm" type="text" class="quantity-req-zipper-two" id="quantity-req-zipper-two" style="border-top: 1px solid #1363a680;" readonly></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </section>

<form id="mainForm"  action="{{ route('forms.store') }}" method="POST" novalidate>
                    @csrf
    <section class="raw-material myTable">
        <div class="container-fluid">
        <div class="top-bar d-flex justify-content-between align-items-center">
            <h2 class="h2">Raw Material Cost</h2>
            <button class="btn btn-before" type="button"  id="addRowButton">Add More Row</button>
        </div>
        <div class="raw-mt-table table-responsive mb-4">
        <table class="table table-bordered text-center" id="materialcosttable">
    <thead>
      <tr>
        <th>Type</th>
        <th>Material</th>
        <th>Solid</th>
        <th>Micron</th>
        <th>Density</th>
        <th>Total GSM</th>
        <th>Cost per Kg</th>
        <th>Waste</th>
        <th>Cost/M<sup>2</sup></th>
        <th>Required Kgs (Estimated)</th>
        <th>Layer</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>

    @foreach(range(1, 8) as $index)
      <tr class="data-row" id="{{$index}}">
        <td class="field-type">
            <select class="form-select typeSelect" id="typeSelect" name="typeSelect[]">
                <option value="" selected disabled hidden>Select Type</option>
                <option value="1">Substrate</option>
                <option value="2">Ink</option>
                <option value="3">Adhesive</option>
            </select>
        </td>
        <td class="field-material">
            <select class="form-select materialSelect" id="materialSelect" name="materialSelect[]">
                <option value="" selected disabled hidden>Select Material</option>
            </select>
        </td>
        <td class="field-solid"><div class="have-percent blue-field"><input type="number" name="solid-input[]" class="solid-input form-control blue-field"><span>%</span></div></td>
        <td class="field-micron"><input type="number" name="micron-input[]" class="form-control blue-field micron-input"></td>
        <td class="field-density"><input type="number" name="density-input[]" class="form-control density-input" readonly></td>
        <td class="field-total-gsm"><input type="number" name="total-gsm-input[]"   class="form-control total-gsm-input" readonly></td>
        <td class="field-cost-per-kg"><input type="text" name="cost-per-kg-input[]" class="form-control blue-field cost-per-kg-input"></td>
        <td class="field-waste"><div class="have-percent blue-field"><input type="number" name="waste-input[]" class="form-control waste-input"><span>%</span></div></td>
        <td class="field-cost-m"><input type="text" class="form-control cost-m-input" name="cost-m-input[]" readonly=""></td>
        <td class="field-required-kgs-estimated"><input type="text" name="estimated-kg-req-input[]"  class="estimated-kg-req-input form-control" readonly></td>
        <td class="field-lower"><input type="text" name="lower-input[]" class="form-control lower-input layer-input" readonly></td>
        <td class="field-action"><button type="button" class="btn btn-cancel"><i class="fas fa-times"></i></button></td>
      </tr>
      @endforeach
            </tbody>
        </table>

          

        <table class="table text-center" style=" margin-top: -50px; ">
            <thead style="visibility: hidden;">
                <tr>
                <th>Type</th>
                <th>Material</th>
                <th>Solid</th>
                <th>Micron</th>
                <th>Density</th>
                <th>Total GSM</th>
                <th>Cost per Kg</th>
                <th>Waste</th>
                <th>Cost/M<sup>2</sup></th>
                <th>Required Kgs (Estimated)</th>
                <th>Layer</th>
                <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <tr style="visibility: hidden;border: none transparent;">
                    <td class="field-type">
                        <select class="form-select typeSelect">
                        <option selected disabled hidden>Select Type</option>
                        <option>Substrate</option>
                        <option>Ink</option>
                        <option>Adhesive</option>
                        </select>
                    </td>
                    <td class="field-material">
                        <select class="form-select">
                        <option selected disabled hidden>Select Material</option>
                        </select>
                    </td>
                    <td class="field-solid">
                        <div class="have-percent blue-field">
                        <input type="number" class="solid-input form-control blue-field">
                        <span>%</span>
                        </div>
                    </td>
                    <td class="field-micron">
                        <input type="number" class="form-control blue-field micron-input">
                    </td>
                    <td class="field-density">
                        <input type="number" class="form-control density-input" readonly>
                    </td>
                    <td class="field-total-gsm">
                        <input type="number" class="form-control total-gsm-input" readonly>
                    </td>
                    <td class="field-cost-per-kg">
                        <input type="text" class="form-control blue-field cost-per-kg-input">
                    </td>
                    <td class="field-waste">
                        <div class="have-percent blue-field">
                        <input type="number" class="form-control waste-input">
                        <span>%</span>
                        </div>
                    </td>
                    <td class="field-cost-m">
                        <input type="text" class="form-control cost-m-input" readonly>
                    </td>
                    <td class="field-required-kgs-estimated">
                        <input type="text" class="estimated-kg-req-input form-control" readonly>
                    </td>
                    <td class="field-lower">
                        <input type="text" class="form-control lower-input layer-input" readonly>
                    </td>
                    <td class="field-action">
                        <button type="button" class="btn btn-cancel">
                        <i class="fas fa-times"></i>
                        </button>
                    </td>
                </tr>

                <tr class="no-border-td">
                <td colspan="3"></td>
                <td colspan="3">
                    <h4 class="h4">Solvent-mix cost / kg</h4>
                </td>
                <td class="field-cost-per-kg">
                    <input type="number" name="cost-per-kg-last-value" class="cost-per-kg-last-value form-control blue-field" value="1.50">
                </td>
                <td class="field-waste"></td>
                <td class="field-cost-m">
                    <input type="number" name="cost-m-last-field-tableless" class="cost-m-last-field-tableless form-control" value="0.0000" readonly>
                </td>
                <td class="field-required-kgs-estimated">
                    <input name="last-est-kg" type="text" value="0.0000" class="form-control last-est-kg" readonly>
                </td>
                <td class="field-lower"></td>
                <td class="field-action"></td>
                </tr>
                <tr class="no-border-td">
                <td class="field-type"></td>
                <td class="field-material"></td>
                <td class="field-solid"></td>
                <td class="field-micron" colspan="3">
                    <h5 class="h5">Ratio of Solvent -Based Inks & Adhesives to Solvent-Mix</h5>
                </td>
                <td class="field-cost-per-kg">
                    <div class="based-ink-res">
                    <div class="top-field">
                        <input type="text" class="form-control" value="1" readonly>
                    </div>
                    <div class="btm-field">
                        <input type="number" value="0.5" name="total-gsm-last-value" class="total-gsm-last-value form-control blue-field">
                    </div>
                    </div>
                </td>
                <td class="field-waste"></td>
                <td class="field-cost-m"></td>
                <td class="field-required-kgs-estimated"></td>
                <td class="field-lower"></td>
                <td class="field-action"></td>
                </tr>
            </tbody>
        </table>


     
        </div>

        <div class="rm-details table-responsive">
        <table class="table table-bordered">
        <tbody>
            <tr>
            <td><label>Film Density</label></td>
            <td class="has-input"><input type="text" readonly name="film-density-input" class="film-density-input" value="NaN G/Cm³"></td>
            <td><label>Pieces Per Kg</label></td>
            <td class="has-input"><input class="pieces-per-kg-field" name="pieces-per-kg-field" type="text" value="0" readonly></td>
            <td><label>Printing Film Width (mm)</label></td>
            <td class="has-input"><input type="text" value="0" name="printing-fil-width" class="printing-fil-width" readonly></td>
            </tr>
            <tr>
            <td><label>Total Micron</label></td>
            <td class="has-input"><input class="total-micron-input" name="total-micron-input" type="text"  readonly></td>
            <td><label>Grams Per Piece</label></td>
            <td class="has-input"><input type="number" value="0.00" name="grams-per-peice" class="grams-per-peice" readonly></td>
            <td><label>Order Quantity In Kg</label></td>
            <td class="has-input"><input type="text" name="orderQuantityInKgs" value="0.000.000" readonly class="orderQuantityInKgs"></td>
            </tr>
            <tr>
            <td><label>Total GSM</label></td>
            <td class="has-input"><input type="number" name="total-gsm-calculated-value" class="total-gsm-calculated-value" readonly></td>
            <td><label>Square Meter Per Kg</label></td>
            <td class="has-input"><input class="square-meter-per-kg-input" name="square-meter-per-kg-input" type="text" value="0.00" readonly></td>
            <td><label>Order Quantity In Kpieces</label></td>
            <td class="has-input"><input name="orderQuanInKpieces" type="text" value="00,000" class="orderQuanInKpieces" readonly></td>
            </tr>
            <tr>
            <td rowspan="2" style=" vertical-align: middle; "><label>Total Cost /M<sup>2</sup></label></td>
            <td rowspan="2" style=" vertical-align: middle; " class="has-input"><input type="text" name="total-cost-m-value" class="total-cost-m-value" value="0.0000" readonly></td>
            <td><label>Linear Meter Per Kg (Film Width)</label></td>
            <td class="has-input"><input type="text" value="0.000.000" name="linear-meter-per-kg" class="linear-meter-per-kg" readonly></td>
            <td rowspan="2" style=" vertical-align: middle; "><label>Order Quantity In Meter</label></td>
            <td rowspan="2"  style=" vertical-align: middle; "class="has-input"><input type="text" value="0.000.000" name="OrderQuanInMeter" class="OrderQuanInMeter" readonly></td>
            </tr>

            <tr>
                <td><label>Linear Meter per Kg (Reel Width)</label></td>
                <td class="has-input"><input  name="hidden-field" class="hidden-field" readonly></td>
            </tr>

        </tbody>
        </table>
    </div>
    <div class="rolling-sec mt-3">
        <h4 class="h4">Roll After Slitting</h4>
        <div class="table-responsive">
            <table class="table table-bordered">
                <tbody>
                    <tr style="margin-bottom: 20px;">
                        <td>Core Inside Dia + Core Thickness X 2</td>
                        <td><div class="have-percent blue-field"><input type="number"  name="core-inside" class="form-control core-inside"><span>mm</span></div></td>
                    </tr>
                    <tr>
                        <td>If Roll Outside Diameter (With Core)</td>
                        <td><div class="have-percent blue-field "><input type="number"  name="roll-outside-diameter" class="form-control roll-outside-diameter"><span>mm</span></div></td>
                    </tr>
                    <tr>
                        <td>Film On Roll Weight</td>
                        <td><div class="have-percent grey-bg"><input type="text" class="form-control film-on-roll-weight" name="film-on-roll-weight" readonly><span>kgs</span></div></td>
                    </tr>
                    <tr>
                        <td>Film On Roll: Length In Meter</td>
                        <td><div class="have-percent grey-bg"><input type="text" name="film-on-roll-length" class="form-control film-on-roll-length" readonly><span>Mtr</span></div></td>
                    </tr>
                    <tr>
                        <td>Roll Width</td>
                        <td><div class="have-percent grey-bg"><input type="text" name="roll-width" class="form-control roll-width" readonly><span>mm</span></div></td>
                    </tr>
                    <tr>
                        <td>Pieces Per Roll</td>
                        <td><input type="text" name="pieces-per-roll" class="input-box pieces-per-roll" value="0" readonly style="background: #e9ecef !important;text-align: right !important;border-radius: 5px !important;"></td>
                    </tr>
                    <tr style="margin-top: 20px;">
                        <td>If Required Roll Weight (Without Core)</td>
                        <td><div class="have-percent blue-field"><input type="number" name="required-roll-weight-kg" class="form-control required-roll-weight-kg"><span>kgs</span></div></td>
                    </tr>
                    <tr>
                        <td>Roll Outside Diameter</td>
                        <td><div class="have-percent grey-bg"><input type="text" name="core-inside-roll" class="form-control core-inside-roll" readonly><span>mm</span></div></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

      <div class="oc-table mt-5">
        <h2 class="h2 pb-3">Operation Cost</h2>
        <div class="table-responsive">
            <table class="table table-bordered align-middle">
                <thead>
                <tr>
                    <th>Processes</th>
                    <th>Speed</th>
                    <th>Setup Hours Required</th>
                    <th>Total Hours Required</th>
                    <th>Process Cost / Hour</th>
                    <th>Process Cost</th>
                    <th>Total Process Cost</th>
                </tr>
                </thead>

                <tbody>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input row-checkbox extrusion-check" name="extrusion-check">
                        <span class="process-heading">Extrusion</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text"  name="first-speed" class="first-speed blue-field extrusion-speed"></td>
                    <td class="has-input"><input type="text" value="0.0" id="first-setup" name="first-setup" class="first-setup blue-field extrusion-setup-hour"></td>
                    <td class="has-input"><input type="text" value="0.00" class="first-hour" name="first-hour" readonly></td>
                    <td class="has-input"><input type="number" value="0" class="blue-field extrusion-process-cost first-process-cost process-cost-unique" name="first-process-cost"></td>
                    <td class="has-input"><input type="text" value="0" name="process-cost-one" class="process-cost-field process-cost-one  " readonly ></td>
                    <td rowspan="10" class="total-cost has-input"><input class="total-process-cost" name="total-process-cost" type="text" value="0" readonly> </td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input row-checkbox printing-check" name="printing-check">
                        <span class="process-heading">Printing</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" id="1s" value="0 Mtr/Min" name="second-speed" class="second-speed blue-field printing-speed speed-feild"></td>
                    <td class="has-input"><input type="text" value="0.0" id="second-setup" name="second-setup" class=" second-setup blue-field printing-setup-hour"></td>
                    <td class="has-input"><input type="text" value="0.0" name="second-hour" class="second-hour" readonly></td>
                    <td class="has-input"><input type="number" value="0" class="blue-field second-process-cost process-cost-unique" name="second-process-cost"></td>
                    <td class="has-input"><input type="text" name="process-cost-two" class="process-cost-two process-cost-field" value="0" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input row-checkbox rewinding-check" name="rewinding-check">
                        <span class="process-heading">rewinding</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" id="2s" value="0 Mtr/Min" name="third-speed" class="third-speed blue-field rewinding-speed speed-feild"></td>
                    <td class="has-input"><input type="text" name="third-setup" value="0.0" class="third-setup blue-field  rewinding-setup-hour"></td>
                    <td class="has-input"><input type="text" value="0.0" name="third-hour" class="third-hour" readonly></td>
                    <td class="has-input"><input type="number" value="0" name="third-process-cost" class="blue-field third-process-cost process-cost-unique"></td>
                    <td class="has-input"><input type="text" value="0" class="process-cost-three process-cost-field" name="process-cost-three" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input row-checkbox lamination-1-check" name="lamination-1-check">
                        <span class="process-heading">lamination 1</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="0 Mtr/Min" name="fourth-speed" class="fourth-speed blue-field lamination-1-speed speed-feild" ></td>
                    <td class="has-input"><input type="text"  value="0.0" name="fourth-setup" class="fourth-setup blue-field lamination-1-setup-hour"></td>
                    <td class="has-input"><input type="text" value="0.0" name="fourth-hour" class="fourth-hour" readonly></td>
                    <td class="has-input"><input type="number" value="0" name="fourth-process-cost" class="blue-field fourth-process-cost process-cost-unique"></td>
                    <td class="has-input"><input type="text" name="process-cost-four" class="process-cost-four process-cost-field" value="0" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input row-checkbox lamination-2-check" name="lamination-2-check">
                        <span class="process-heading">lamination 2</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="0 Mtr/Min" name="fifth-speed" class="fifth-speed blue-field lamination-2-speed speed-feild"></td>
                    <td class="has-input"><input type="text" value="0.0" name="fifth-setup" class="fifth-setup lamination-2-setup-hour blue-field update-hour"></td>
                    <td class="has-input"><input type="text" value="0.0" class="fifth-hour" name="fifth-hour" readonly></td>
                    <td class="has-input"><input type="number" value="0" name="fifth-process-cost" class="blue-field fifth-process-cost process-cost-unique"></td>
                    <td class="has-input"><input type="text" name="process-cost-fifth" class="process-cost-fifth process-cost-field" value="0" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input row-checkbox lamination-3-check" name="lamination-3-check">
                        <span class="process-heading">lamination 3</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="0 Mtr/Min" name="six-speed" class="six-speed blue-field lamination-3-speed speed-feild"></td>
                    <td class="has-input"><input type="text" value="0.0" name="six-setup" class=" six-setup blue-field lamination-3-setup-hour update-hour"></td>
                    <td class="has-input"><input type="text" value="0.0" name="six-hour" class="six-hour" readonly></td>
                    <td class="has-input"><input type="number" value="0" name="six-process-cost" class="blue-field six-process-cost process-cost-unique" ></td>
                    <td class="has-input"><input type="text" value="0" class="process-cost-six process-cost-field" name="process-cost-six" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input row-checkbox slitting-check" name="slitting-check">
                        <span class="process-heading">Slitting</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="0 Mtr/Min" name="seven-speed" class="seven-speed blue-field slitting-speed speed-feild"></td>
                    <td class="has-input"><input type="text" value="0.0" name="seven-setup" class=" seven-setup slitting-setup-hour blue-field update-hour"></td>
                    <td class="has-input"><input type="text" value="0.0" class="seven-hour" name="seven-hour" readonly></td>
                    <td class="has-input"><input type="number" value="0" name="seven-process-cost" class="blue-field seven-process-cost process-cost-unique"></td>
                    <td class="has-input"><input type="text" value="0" class="process-cost-seven process-cost-field" name="process-cost-seven" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input row-checkbox sleeving-check" name="sleeving-check">
                        <span class="process-heading">Sleeving</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="0 Mtr/Min" name="eight-speed" class="eight-speed blue-field sleeving-speed speed-feild"></td>
                    <td class="has-input"><input type="text" value="0.0" name="eight-setup" class=" eight-setup sleeving-setup-hour blue-field update-hour"></td>
                    <td class="has-input"><input type="text" value="0.0" class="eight-hour" name="eight-hour" readonly></td>
                    <td class="has-input"><input type="number" value="0" name="eight-process-cost" class="blue-field eight-process-cost process-cost-unique"></td>
                    <td class="has-input"><input type="text" value="0" class="process-cost-eight process-cost-field" name="process-cost-eight" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input row-checkbox doctoring-check" name="doctoring-check">
                        <span class="process-heading">Sleeve Doctoring</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="0 Mtr/Min" name="nine-speed" class="nine-speed blue-field speed-feild doctoring-speed"></td>
                    <td class="has-input"><input type="text" value="0.0" name="nine-setup" class="nine-setup blue-field update-hour doctoring-setup-hour"></td>
                    <td class="has-input"><input type="text" value="0.0" class="nine-hour" name="nine-hour" readonly></td>
                    <td class="has-input"><input type="number" value="0" name="nine-process-cost" class="blue-field nine-process-cost process-cost-unique"></td>
                    <td class="has-input"><input type="text" name="process-cost-nine" class="process-cost-nine process-cost-field" value="0" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input row-checkbox pouch-making-check " name="pouch-making-check">
                        <span class="process-heading">Pouch Making</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="0 Pcs/Min" name="ten-speed" class="ten-speed blue-field pouch-speed-feild pouch-speed"></td>
                    <td class="has-input"><input type="text" value="0.0" name="ten-setup" class="ten-setup blue-field update-hour doctoring-setup-hour "></td>
                    <td class="has-input"><input type="text" value="0.0" class="ten-hour" name="ten-hour" readonly></td>
                    <td class="has-input"><input type="number" value="0" name="ten-process-cost" class="blue-field ten-process-cost process-cost-unique"></td>
                    <td class="has-input"><input type="text" name="process-cost-ten" class="process-cost-ten process-cost-field" value="0" readonly></td>
                    
                </tr>
                <tr style="border: 0;">
                    <td colspan="5" style="border: 0;"></td>
                    <td style="border: 0;"><h4 style="font-size: 17px;margin-bottom: 0;text-align: center;">Operation Cost Per Kg</h4></td>
                    <td class="has-input" style="border: 0;"><input class="opearion-cost-per-kg" id="opearion-cost-per-kg" name="opearion-cost-per-kg" type="number" value="0.00" readonly> </td>
                </tr>
                
                
                </tbody>
            </table>
        </div>
    </div>


       <div class="oc-table total-cost mt-5">
        <h2 class="h2 pb-3">Total Cost</h2>
        <div class="table-responsive">
            <table class="table table-bordered align-middle">
                <thead>
                <tr>
                    <th style="background-color: transparent !important;border-top: none; border-left: none; border-right: none;border-bottom: 1px solid #dee2e6;" ></th>
                    <th>raw merterial cost</th>
                    <th class="th-has-tag"><span>Markup</span><input type="number" class="markupPercent blue-field" name="markupPercent">%</th>
                    <th>Plates / cylinders cost</th>
                    <th>Delivery Cost</th>
                    <th>operation cost</th>
                    <th>Sale Price</th>
                </tr>
                </thead>
                
                <tbody>
                <tr>
                    <td class="has-label"><label>per kg</label></td>
                    <td class="has-input"><input type="number" value="0.0000" name="first-per-kg-value" class="per-kg-field" readonly></td>
                    <td class="has-input"><input type="number" value="0.00" name="second-per-kg-value" class="second-per-kg-value" readonly></td>
                    <td class="has-input"><input type="number"  name="third-per-kg-value" class="third-per-kg-value blue-field"></td>
                    <td class="has-input"><input type="number"  name="fourth-per-kg" class="fourth-per-kg blue-field"></td>
                    <td class="has-input"><input type="number" name="fifth-per-kg" class="blue-field fifth-per-kg"></td>
                    <td class="has-input"><input type="number"  name="six-kg" class="six-kg" readonly></td>
                </tr>
                <tr>
                    <td class="has-label"><label>per kpcs</label></td>
                    <td class="has-input"><input type="number" value="0.00" name="perKpcsFirst" class="perKpcs" readonly></td>
                    <td class="has-input"><input type="number" value="0.00" name="perKpcsSecond" class="perKpcsSecond" readonly></td>
                    <td class="has-input"><input type="number" value="0.00" name="perKpcsthird" class="perKpcsthird" readonly></td>
                    <td class="has-input"><input type="number" value="0.00" name="perkpcsfourth" class="perkpcsfourth" readonly></td>
                    <td class="has-input"><input type="number" value="0.00" name="fifth-kpcs" class="fifth-kpcs" readonly></td>
                    <td class="has-input"><input type="number" value="0.00" name="six-kpcs" class=" six-kpcs" readonly></td>
                </tr>
                <tr>
                    <td class="has-label"><label>per SQM</label></td>
                    <td class="has-input"><input class="per-sqm-field" name="FirstPerSqm" type="number" value="0.00" readonly></td>
                    <td class="has-input"><input type="number" value="0.0000" class="secondPerSqm" name="secondPerSqm" readonly></td>
                    <td class="has-input"><input type="number" value="0.0000" class="ThirdPerSqm" name="ThirdPerSqm" readonly></td>
                    <td class="has-input"><input type="number" value="0.0000" name="fourthPerSqm" class="fourthPerSqm" readonly></td>
                    <td class="has-input"><input type="number" value="0.0000" class="fifth-sqm" name="fifth-sqm" readonly></td>
                    <td class="has-input"><input type="number" value="0.0000" name="six-sqm" class="six-sqm " readonly></td>
                </tr>
                <tr>
                    <td class="has-label"><label>per LM</label></td>
                    <td class="has-input"><input type="number" name="perLmValue" value="0.0000" class="perLmValue" readonly></td>
                    <td class="has-input"><input type="number" value="0.0000" class="secondPerLM" name="secondPerLM" readonly></td>
                    <td class="has-input"><input type="number" value="0.0000" name="thirdPerLM" class="thirdPerLM" readonly></td>
                    <td class="has-input"><input type="number" value="0.0000" name="fourthLm" class="fourthLm" readonly></td>
                    <td class="has-input"><input type="number" value="0.0000" class="fifth-lm" name="fifth-lm" readonly></td>
                    <td class="has-input"><input type="number" value="0.0000" class=" six-lm" name="six-lm" readonly></td>
                </tr>
                <tr>
                    <td class="has-label"><label>Per Roll 500 LM</label></td>
                    <td class="has-input"><input type="number" name="firstPerRoll" value="0.00" class="firstPerRoll" readonly></td>
                    <td class="has-input"><input type="number" value="0.00" class="secondPerRoll" name="secondPerRoll" readonly></td>
                    <td class="has-input"><input type="number" value="0.00" name="thirdPerRoll" class="thirdPerRoll" readonly></td>
                    <td class="has-input"><input type="number" value="0.00" name="fourthPerRoll" class="fourthPerRoll" readonly></td>
                    <td class="has-input"><input type="number" value="0.00" class="fifthPerRoll" name="fifthPerRoll" readonly></td>
                    <td class="has-input"><input type="number" value="0.00" class="field sixPerRoll" name="sixPerRoll" readonly></td>
                </tr>
                </tbody>
            </table>
        </div>
    </div>

    <div class="mt-5">
        <h2 class="h2 pb-3">Actual Vs Estimation</h2>
            <div class="table-responsive">
            <table class="table table2 table-responsive" style="border-color: transparent;border-bottom: 0;">
                    <thead>
                    <tr>
                        <td style="background-color: #1363A6;color: #FFF;font-weight: 400;text-align: center;border: 1px solid #1363a6;">
                            <label>Final Output</label>
                        </td>
                        <td style="width: 90%;border-bottom: 0;" ></td>
                        
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td style="font-weight: 400;border: 1px solid #dee2e6;border-top: 0;">
                            <div class="have-percent blue-field"><input type="text"  name="final-output" class="final-output" style="min-"><span>Kgs</span></div>
                        </td>
                        <td style="width: 90%;border-bottom: 0;"></td>
                        
                    </tr>
                </tbody>
            </table>
            </div>
    </div>
    <div class="oc-table total-cost pb-5 actual-table graphTable">
            <div class="cont">
                <div class="table-responsive">
                    <table class="table table-bordered align-middle new-table" id="graphTable">
                        <thead>
                        <tr>
                            <th>Material</th>
                            <th>Actual Consumption</th>
                            <th>Cost Per Kg</th>
                            <th>Total Amount</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td><input type="text" value="Solvent - Mix" name="actual-material-solvent" class="actual-material-solvent" readonly></td>
                            <td><input type="text"  name="actual-consumption-solvent" class="actual-consumption-solvent blue-field"></td>
                            <td><input type="number" value="0" name="actual-cost-per-kg-solvent" class="actual-cost-per-kg-solvent" readonly></td>
                            <td><input type="text" value="0" name="actual-total-amount-solvent" class="actual-total-amount-solvent" readonly></td>
                            <td style="visibility: hidden;border-color: transparent;padding:0;" > <input type="text" value="0" name="solvent-mix-hidden-field" class="solvent-mix-hidden-field" readonly hidden></td>
                        </tr>
                    </tbody>
                </table>
                <table class="table table-bordered align-middle new-table" style="margin-top: -70px;z-index: -1;position: relative;">
                        <thead>
                        <tr style="visibility: hidden;">
                            <th>Material</th>
                            <th>Actual Consumption</th>
                            <th>Cost Per Kg</th>
                            <th>Total Amount</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr style="visibility: hidden;border-color: transparent">
                            <td><input type="text" value="Solvent-Mix" name=""  readonly></td>
                            <td><input type="number" value="0" name="" class=""></td>
                            <td><input type="number" value="0" name="" class="" readonly></td>
                            <td><input type="number" value="0" name="" class="" readonly></td>
                        </tr>
                        <tr>
                            <td style="border-top: 1px solid #dee2e6 !important;" colspan="3"><label></label></td>
                            <td style="border-top: 1px solid #dee2e6 !important;"><input style="font-weight: 600;" type="text" name="last-total-amount-one" class="last-total-amount-one" value="0"  readonly></td>
                        </tr>
                        <tr>
                            <td colspan="3" style="text-align:right !important;color: #1363a6;font-weight: 600;"><label>Actual Raw Material Cost Per Kg ---></label></td>
                            <td><input style="font-weight: 600;" type="number" value="0" class="actual-raw-material-cost-one" name="actual-raw-material-cost-one"  readonly></td>
                        </tr>
                        <tr>
                            <td colspan="3" style="text-align:right !important;color: #1363a6;font-weight: 600;"><label>Difference ---></label></td>
                            <td style="overflow:hidden;"><div class="have-percent" style="justify-content: center;color: #000 !important;padding-right:0;"><input type="number" value="0" name="last-difference-one" class="last-difference-one"  style="color: #000 !important;width: 100px;font-weight: 600;margin-left: -50px;" readonly><span>%</span></div></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="graph graph-col graph1">
                <canvas id="barChart"></canvas>
            </div>
        </div>
    </div>


    <div class="last-div total-cost mt-5 pb-5">
        <div class="table-responsive">
            <table class="table table-bordered align-middle " id="lowerTable">
                <thead>
                <tr>
                    <th>Processes</th>
                    <th>Actual Hours</th>
                    <th>Process Cost / Hour</th>
                    <th>Total Amount</th>
                </tr>
                </thead>
                
                <tbody>
                </tbody>
            </table>


            <table class="table table-bordered align-middle new-table" style="margin-top: -70px;z-index: -1;position: relative;">
                    <thead>
                    <tr style="visibility: hidden;">
                        <th>Material</th>
                        <th>Actual Consumption</th>
                        <th>Cost Per Kg</th>
                        <th>Total Amount</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr style="visibility: hidden;border-color: transparent">
                        <td><input type="text" value="Solvent-Mix" name=""  readonly></td>
                        <td><input type="number" value="0" name="" class=""></td>
                        <td><input type="number" value="0" name="" class="" readonly></td>
                        <td><input type="number" value="0" name="" class="" readonly></td>
                    </tr>
                    <tr>
                        <td style="border-top: 1px solid #dee2e6 !important;" colspan="3"><label></label></td>
                        <td style="border-top: 1px solid #dee2e6 !important;"><input style="font-weight: 600;" type="text" name="last-total-amount-two" class="last-total-amount-two" value="0"  readonly></td>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align:right !important;color: #1363a6;font-weight: 600;"><label>Actual Operation Cost Per Kg ---></label></td>
                        <td><input style="font-weight: 600;" type="number" value="0.00" class="actual-raw-material-cost-two" name="actual-raw-material-cost-two"  readonly></td>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align:right !important;color: #1363a6;font-weight: 600;"><label>Difference ---></label></td>
                        <td style="overflow:hidden;"><div class="have-percent" style="justify-content: center;color: #000 !important;padding-right:0;"><input type="number" value="0.00" name="last-difference-two" class="last-difference-two" style="color: #000 !important;width: 100px;font-weight: 600;margin-left: -50px;" readonly><span>%</span></div></td>
                    </tr>
                </tbody>
            </table>

            <div class="graph graph-col graph1">
                <canvas id="secondbarChart"></canvas>
            </div>

        </div>
    </div>
     
   

    <div  style="padding-bottom: 3rem;">
        <div class="table-responsive">
            <table class="table-bordered table" style="max-width: 500px;margin: 0 auto 3rem;">
                <thead>
                    <td style="text-align: center; min-width: 150px;background: #1363A6; color: #FFF;font-weight: 500;">Sales Price</td>
                    <td style="border: 1px solid #dee2e6; background: #d2edff;text-align: center;"><input type="number" name="lastSalesPrice" class="lastSalesPrice" value="0" style="background: #d2edff;"></td>
                </thead>
            </table>
        </div>

        <div class="table-responsive">
            <table class="table-bordered table" style="max-width: 500px;margin: 0 auto;">
                <thead>
                    <tr>
                        <th></th>
                        <th><label>Per Kg</label></th>
                        <th><label>% of Sales Price</label></th>
                        <th><label>Difference</label></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border-top: 1px solid #dee2e6">Estimated Total Cost</td>
                        <td>
                            <input type="number" value="0" name="estimation-total-cost" class="estimation-total-cost" readonly
                                style="text-align: center !important;">
                        </td>
                        <td>
                            <input type="text" value="0.0 %" name="firstPercentage" class="firstPercentage" readonly
                                style="text-align: center !important;width: fit-content;">
                        </td>
                        <td rowspan="2">
                            <div style="display: table;height: 63px;">
                                <div style="display: table-cell;border-right: 1px solid #dee2e6;vertical-align: middle;">
                                    <input type="text" value="0.00" name="firstDifferenceValue" class="firstDifferenceValue" readonly
                                    style="text-align: center !important;">
                                </div>
                                <div style="display: table-cell;vertical-align: middle;">
                                    <input type="text" value="0.0 %" name="secondDifferenceValue" class="secondDifferenceValue" readonly
                                    style="text-align: center !important;">
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr><input type="number" value="0" class="actual-difference" name="actual-difference"  hidden>
                        <td style="border-top: 1px solid #dee2e6">Actual Total Cost </td>
                        <td>
                            <input type="number" value="0" name="actual-total-cost" class="actual-total-cost" readonly
                                style="text-align: center !important;">
                        </td>
                        <td>
                            <input type="text" value="0.0 %" name="secondPercentage" class="secondPercentage" readonly
                                style="text-align: center !important;width: fit-content;">
                        </td>
                    </tr>
                    <tr style="border-bottom: 0;">
                        <td style="border-top: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;">Estimated Margin</td>
                        <td style="border-bottom: 1px solid #dee2e6;">
                            <input type="text" value="0.00" name="estimatedMargin" class="estimatedMargin" readonly
                                style="text-align: center !important;">
                        </td>
                        <td style="border-bottom: 1px solid #dee2e6;">
                            <input type="text" value="0.0 %" name="thirdPercentage" class="thirdPercentage" readonly
                                style="text-align: center !important;width: fit-content;">
                        </td>
                    </tr>
                    <tr style="border-top: 0;border-bottom: 0;">
                        <td style="border-top: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;">Actual Margin</td>
                        <td style="border-bottom: 1px solid #dee2e6;">
                            <input type="text" value="0.00" name="actualMargin" class="actualMargin" readonly
                                style="text-align: center !important;">
                        </td>
                        <td style="border-bottom: 1px solid #dee2e6;">
                            <input type="text" value="0.0 %" name="fourthPercentage" class="fourthPercentage" readonly
                                style="text-align: center !important;width: fit-content;">
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <div class="remarks-sec" style="margin-bottom: 30px;">
        <div class="table-responsive">
            <table class="table-bordered table" style="max-width: 995px;margin: 0 auto;">
                <thead>
                    <tr>
                        <th>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><textarea name="remarks" style="text-align: center !important; width: 100%;" rows="10" placeholder="Enter Your Remarks Here...."></textarea></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>


</form>

    </div> <!-- container div end -->
           
    </section>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
    <script type="text/javascript">
        function validateDecimalFormat(input) {
            // Regular expression to match the desired format (e.g., 0.0, 1.1)
            const validFormat = /^\d+(\.\d)?$/;
            
            // Check if the input matches the format
            if (!validFormat.test(input.value)) {
                // If not, remove invalid characters
                input.value = input.value.slice(0, -1);
            }
        }

        function validateDecimalInput(input) {
            // Allow only numbers and up to two decimal places
            const regex = /^\d*\.?\d{0,2}$/;

            // Check if the value matches the regex
            if (!regex.test(input.value)) {
                // If invalid, remove the last character
                input.value = input.value ? input.value.slice(0, -1) : '';
            }
        }
        function formatNumberWithCommas(input) {
            // Remove any non-numeric characters except for digits
            let value = input.value.replace(/[^0-9]/g, '');

            // Format the number with commas using toLocaleString
            if (value) {
                input.value = parseInt(value, 10).toLocaleString('en-US');
            }
        }
    </script>
<script>
    document.getElementById('productType').addEventListener('change', function () {
        const selectedValue = this.value;

        // Hide all tables
        document.getElementById('roll-table').style.display = 'none';
        document.getElementById('sleeve-table').style.display = 'none';
        document.getElementById('pouch-table').style.display = 'none';

        // Show the appropriate table
        if (selectedValue === 'roll') {
            document.getElementById('roll-table').style.display = 'block';
        } else if (selectedValue === 'sleeve') {
            document.getElementById('sleeve-table').style.display = 'block';
        } else if (selectedValue === 'bag-pouch') {
            document.getElementById('pouch-table').style.display = 'block';
        }

    });
</script>
<script>
    document.addEventListener("DOMContentLoaded", function () {


    document.querySelectorAll('.row-checkbox').forEach(function (checkbox) {
        checkbox.addEventListener('change', function () {
            const row = checkbox.closest('tr');
            const inputs = row.querySelectorAll('input:not(.row-checkbox)');

            if (checkbox.checked) {
                inputs.forEach(input => {
                    input.removeAttribute('disabled');  // Enable inputs
                    input.removeAttribute('readonly');  // Remove readonly
                });
            } else {
                inputs.forEach(input => {
                    input.setAttribute('readonly', 'true');  // Use readonly instead
                    input.value = 0; // Set value to zero
                });
            }
        });

        // Trigger the event on page load to set the correct initial state
        checkbox.dispatchEvent(new Event('change'));
    });


     var materialOptions = @json($materials);

    Chart.register(ChartDataLabels);
    function initializeChart() {
    const ctx = document.getElementById("barChart").getContext("2d");
    barChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: [],
            datasets: [{
                label: "Raw Materials Cost Allocation (%)",
                data: [],
                backgroundColor: "#1363A6",
                borderColor: "#1363A6",
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
                tooltip: {
                    enabled: true,
                },
                datalabels: {
                    display: true,
                    color: "#0000FF", // Blue text
                    anchor: "end",
                    align: function(context) {
                        return context.dataset.data[context.dataIndex] > 90 ? "start" : "end";
                    },
                    font: {
                        weight: "bold",
                        size: 12,
                    },
                    formatter: (value) => {
                        return value + "%";
                    },
                    clip: false, // Prevents labels from being cut off
                    backgroundColor: "#FFD700", // Yellow background
                    borderRadius: 4,
                    padding: 4,
                },
                legend: {
                    labels: {
                        font: {
                            size: 16,
                            weight: "bold"
                        },
                        color: "#000"
                    }
                }
            },
            layout: {
                padding: {
                    right: 20, // Extra padding for large values
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        font: {
                            weight: "bold"
                        },
                        color: "#000",
                    }
                },
                y: {
                    ticks: {
                        font: {
                            weight: "bold"
                        },
                        color: "#000",
                    }
                }
            },
        },
    });

    console.log("Bar Chart initialized:", barChart);
}

    // Call the function
    initializeChart();


    let secondBarChart;

    function initializesecondChart() {
    const ctx = document.getElementById("secondbarChart").getContext("2d");

    secondBarChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: [],
            datasets: [{
                label: "Operation Cost Allocation (%)",
                data: [],
                backgroundColor: "#1363A6",
                borderColor: "#1363A6",
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
                tooltip: {
                    enabled: true,
                },
                datalabels: {
                    display: true,
                    color: "#0000FF", // Blue text
                    anchor: "end",
                    align: function(context) {
                        return context.dataset.data[context.dataIndex] > 90 ? "start" : "end";
                    }, 
                    font: {
                        weight: "bold",
                        size: 12,
                    },
                    formatter: (value) => {
                        return value + "%";
                    },
                    clip: false, // Prevents clipping
                    backgroundColor: "#FFD700", // Yellow background
                    borderRadius: 4,
                    padding: 4,
                },
                legend: {
                    labels: {
                        font: {
                            size: 16,
                            weight: "bold"
                        },
                        color: "#000"
                    }
                }
            },
            layout: {
                padding: {
                    right: 20, // Extra padding for large values
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        font: {
                            weight: "bold"
                        },
                        color: "#000",
                    }
                },
                y: {
                    ticks: {
                        font: {
                            weight: "bold"
                        },
                        color: "#000",
                    }
                }
            },
        },
    });

    console.log("Second Chart initialized:", secondBarChart);
}

// Call the function
initializesecondChart();

    document.getElementById("mainForm").addEventListener("submit", function(event) {
        let dateInput = document.getElementById("project_date");
        if (!dateInput.value) {
            alert("Please select a date before submitting.");
            event.preventDefault(); // Prevent form submission
        }
    });

   
    // Options for the material dropdown based on type selection
    

    function updateMaterialDropdown(selectElement) {
        const materialSelect = selectElement.closest("tr").querySelector(".field-material select");
        const selectedType = selectElement.value;

        materialSelect.innerHTML = '<option value="" selected disabled hidden>Select Material</option>';
        if (materialOptions[selectedType]) {
            materialOptions[selectedType].forEach(option => {
                const opt = document.createElement("option");
                opt.value = option.value;
                opt.textContent = option.text;
                materialSelect.appendChild(opt);
            });
        }
    }

  function setInputValues(row, material) {
    const inputs = {
        solidInput: row.querySelector(".solid-input"),
        densityInput: row.querySelector(".density-input"),
        costPerKgInput: row.querySelector(".cost-per-kg-input"),
        wasteInput: row.querySelector(".waste-input"),
        micronInput: row.querySelector(".micron-input"),
        costInput: row.querySelector(".cost-m-input"),
        inputGsmTotal: row.querySelector(".total-gsm-input"),
    };

    const defaultValues = { solid: "", density: "", costPerKg: "", waste: "", micron: "", cost: "", totalGsm: "" };

    // Clear existing values before fetching new ones
    Object.keys(inputs).forEach(key => inputs[key].value = "");

    // Encode material name to handle spaces and special characters
    const encodedMaterial = encodeURIComponent(material);

    // Fetch material data dynamically
    fetch(`/materials/${encodedMaterial}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Ensure the response has the expected keys
            const values = {
                solid: data.solid || "",
                density: data.density || "",
                costPerKg: data.costPerKg ? parseFloat(data.costPerKg).toFixed(2) : "",
                waste: data.waste || "",
                micron: "",
                cost: "",
                totalGsm: "",
            };

            // Assign values to inputs
            inputs.solidInput.value = values.solid;
            inputs.densityInput.value = values.density;
            inputs.costPerKgInput.value = values.costPerKg;
            inputs.wasteInput.value = values.waste;
            inputs.micronInput.value = values.micron;
            inputs.costInput.value = values.cost;
            inputs.inputGsmTotal.value = values.totalGsm;

            updateLowerTableRow(row.id);
        })
        .catch(error => {
            console.error("Error fetching material data:", error);
            alert("Failed to load material data. Please check your network or try again.");
        });
}



    document.querySelectorAll('.cost-per-kg-input').forEach(input => {
        input.addEventListener('blur', function () {
            if (this.value) {
                this.value = parseFloat(this.value).toFixed(2);
            }
        });
    });

    document.querySelectorAll(".field-type select").forEach(select => {
        select.addEventListener("change", function () {
            updateMaterialDropdown(this);
            calculateLastCostM();
        });
    });

    document.querySelectorAll(".field-material select").forEach(select => {
        select.addEventListener("change", function () {
            const row = this.closest("tr");
            const selectedMaterial = this.value;
            setInputValues(row, selectedMaterial);
            calculateLastCostM();
        });
    });

   document.getElementById("addRowButton").addEventListener("click", function () {
        const tbody = document.getElementById("materialcosttable").querySelector("tbody");
        const rows = tbody.querySelectorAll(".data-row");
        const lastRow = rows[rows.length - 1]; // Get the last row
        const lastRowId = lastRow ? parseInt(lastRow.id.replace('row-', '')) : 0; // Extract the last ID, defaulting to 0 if no rows exist

        const newRow = lastRow ? lastRow.cloneNode(true) : document.createElement("tr"); // Create new row from the last or empty row
        const newRowId = lastRowId + 1; // Increment the ID

        newRow.id = `${newRowId}`; // Assign the new ID to the row

        newRow.querySelectorAll("input").forEach(input => input.value = "");
        newRow.querySelectorAll("select").forEach(select => select.selectedIndex = 0);

        const newTypeSelect = newRow.querySelector(".field-type select");
        newTypeSelect.addEventListener("change", function () {
            updateMaterialDropdown(this);
        });

        const newMaterialSelect = newRow.querySelector(".field-material select");
        newMaterialSelect.addEventListener("change", function () {
            const row = this.closest("tr");
            const selectedMaterial = this.value;
            setInputValues(row, selectedMaterial);
            appendOrUpdateRowToLowerTable(row.id); // Update the lower table for the new row
        });

        const cancelButton = newRow.querySelector(".field-action .btn-cancel");
        cancelButton.addEventListener("click", function () {
            removeRow(this);
        });

        // Add event listener to micron-input for the new row
        const micronInput = newRow.querySelector(".field-micron input");
        micronInput.addEventListener("input", function () {
            calculateTotalGSM(this);
        });

        const costInput = newRow.querySelector(".field-cost-per-kg input");
        costInput.addEventListener("input", function () {
            calculateTotalGSM(this);
        });

        const fieldInput = newRow.querySelector(".field-waste input");
        fieldInput.addEventListener("input", function () {
            calculateEstimatedKgReq();
            calculateTotalGSM(this);
        });

        tbody.appendChild(newRow); // Append the new row to the table

        // Now re-trigger the function to handle the new row
        appendOrUpdateRowToLowerTable(newRow.id);
    });

    function removeRow(buttonElement) {
        const row = buttonElement.closest("tr");
        const tableBody = row.closest("tbody");
        const rowId = row.id; // Get the row ID

        if (tableBody.querySelectorAll(".data-row").length > 1) {
            tableBody.removeChild(row);



            let lowerRow = document.querySelector(`#lower-row-${rowId}`);
            if (!lowerRow) {
                lowerRow = document.querySelector(`#lower-row-row-${rowId}`); // Check the alternative ID format
                updateChart();
                updateSecondChart();
            }

            if (lowerRow) {
                lowerRow.remove(); // Remove lower row if it exists
                updateChart();
                updateSecondChart();
            }
            
            // Recalculate totals
            calculateTotalMicron();
            calculateTotalGSMValue();
            calculateLastCostM();
            calculateTotalCostM();
            calculateLastEstimatedKg();
            calculatePiecesPerKg();
        } else {
            alert("You cannot remove the last row.");
        }
    }

    document.querySelectorAll(".field-action .btn-cancel").forEach(button => {
        button.addEventListener("click", function () {
            removeRow(this);
            
        });
    });

    function calculateTotalGSM(micronInputElement) {

        const row = micronInputElement.closest("tr");

        const micronValue = parseFloat(row.querySelector(".micron-input").value);
        const densityValue = parseFloat(row.querySelector(".density-input").value);
        const solidValue = parseFloat(row.querySelector(".solid-input").value); // Added for solid-input
        const totalGSMInput = row.querySelector(".total-gsm-input");
        
        const costPerKgInput = row.querySelector(".cost-per-kg-input");
        
        const costMInput = row.querySelector(".cost-m-input");
        const typeSelect = row.querySelector(".field-type select").value;
        const WastP = parseFloat(row.querySelector(".waste-input").value);

        const lowerInput = row.querySelector(".lower-input"); // The lower-input field
        // Calculate total GSM based on typeSelect
        if (typeSelect == 1) {
            // If type is "Substrate"
            if (!isNaN(micronValue) && !isNaN(densityValue)) {
                totalGSMInput.value = (micronValue * densityValue).toFixed(2);
                calculatePiecesPerKg();
            } else {
                totalGSMInput.value = "0.00";
                calculateTotalMicron();
                calculateLastCostM();
                calculatePerKg();
                
            
                
            }
        } else {
            // For other types (Ink or Adhesive)
            if (!isNaN(solidValue) && !isNaN(micronValue)) {
                totalGSMInput.value = ((solidValue * micronValue) / 100).toFixed(2);
                calculatePiecesPerKg();
            } else {
                totalGSMInput.value = "0.00";
                calculateTotalMicron();
                calculateLastCostM();
                calculateFilmDensityFromMicron();
                


            }
        }

        // Calculate cost/m
        if (typeSelect == 1) {
            // If type is "Substrate"
            const totalGSM = parseFloat(totalGSMInput.value);
            const costPerKg = parseFloat(costPerKgInput.value);
            const Waste = parseFloat(WastP.value);
            if (!isNaN(totalGSM) && !isNaN(costPerKg)) {
                costMInput.value = (((totalGSM * costPerKg) / 1000) * (1 + (WastP / 100))).toFixed(4);
                calculateTotalMicron();
                calculateLastCostM();
                calculateTotalCostM();

                // costMInput.value = ((totalGSM * costPerKg) / 1000).toFixed(4);
            } else {
                costMInput.value = "";
                calculateTotalMicron();
                calculateLastCostM();
                calculateTotalCostM();
            }
        } else {
            // If type is not "Substrate" (i.e., Ink or Adhesive)
            const micronValue = parseFloat(micronInputElement.value);
            const costPerKg = parseFloat(costPerKgInput.value);
            const Waste = parseFloat(WastP.value);
            if (!isNaN(micronValue) && !isNaN(costPerKg)) {
                // costMInput.value = ((micronValue * costPerKg) / 1000).toFixed(4);
                costMInput.value = (((micronValue * costPerKg) / 1000) * (1 + (WastP / 100))).toFixed(4);
                calculateTotalMicron();
                calculateLastCostM();
                calculateTotalCostM();
            } else {
                costMInput.value = "";
                calculateTotalMicron();
                calculateTotalCostM();

            }
        }

        calculateEstimatedKgReq();

    }



    document.querySelectorAll(".field-micron input").forEach(input => {
        input.addEventListener("input", function () {
            calculateTotalGSM(this);
            calculateTotalGSMValue(); 
            calculatePiecesPerKg();
        });
    });

    document.querySelectorAll(".waste-input").forEach((wasteInput) => {
        wasteInput.addEventListener("input", function () {
            const row = this.closest("tr");
            const micronInputElement = row.querySelector(".micron-input");
            if (micronInputElement) {
                calculateTotalGSM(micronInputElement);
            }
            calculateTotalGSMValue(); 
            calculatePiecesPerKg();
        });
    });

    document.querySelectorAll(".solid-input").forEach(solidInput => {
            solidInput.addEventListener("input", function () {
                calculateTotalGSM(this);
            });
        });


    document.querySelectorAll(".cost-per-kg-input").forEach(input => {
        input.addEventListener("input", function () {
            const row = this.closest("tr");
            const micronInputElement = row.querySelector(".micron-input");
            if (micronInputElement) {
                calculateTotalGSM(micronInputElement);
            }
            calculateTotalGSMValue(); 
            calculatePiecesPerKg();
            
        });
    });




    // Function to calculate total micron value and update total-micron-input
    // Function to calculate the total micron value
 function calculateTotalMicron() {
        let totalMicronType1 = 0; // Sum of micronInput for type 1
        let totalGsmType2 = 0;    // Sum of totalGsmInput for type 2
        let totalGsmType3 = 0;    // Sum of totalGsmInput for type 3

        document.querySelectorAll("tr").forEach((row) => {
            const typeSelect = row.querySelector(".field-type select")?.value;
            const micronInput = parseFloat(row.querySelector(".micron-input")?.value || 0);
            const totalGsmInput = parseFloat(row.querySelector(".total-gsm-input")?.value || 0);

            if (typeSelect === "1") {
                totalMicronType1 += micronInput;
            } else if (typeSelect === "2") {
                totalGsmType2 += totalGsmInput;
            } else if (typeSelect === "3") {
                totalGsmType3 += totalGsmInput;
            }
        });

        const totalMicron = totalMicronType1 + totalGsmType2 + totalGsmType3;

        const totalMicronInputField = document.querySelector(".total-micron-input");
        if (totalMicronInputField) {
            totalMicronInputField.value = totalMicron.toFixed(1);
        }
        calculateTotalGSMValue();
        calculateFilmDensityFromMicron();
        calculateFilmOnRollLength();
    }

// Function to attach event listeners to a row
function attachEventListenersToRow(row) {
    // Listen for changes on micron-input, total-gsm-input, and typeSelect
    row.querySelectorAll(".micron-input, .total-gsm-input").forEach((input) => {
        input.addEventListener("input", calculateTotalMicron);
    });

    const typeSelect = row.querySelector("#typeSelect");
    if (typeSelect) {
        typeSelect.addEventListener("change", calculateTotalMicron);
    }
}

// Attach event listeners to existing rows on page load
document.querySelectorAll("tr").forEach((row) => {
    attachEventListenersToRow(row);
});

// Recalculate on page load for initial state
calculateTotalMicron();

// Dynamic addition of rows (if rows can be added dynamically in your application)
document.addEventListener("rowAdded", (event) => {
    const newRow = event.detail.row; // Assuming the new row is passed in the event detail
    attachEventListenersToRow(newRow); // Attach event listeners to the new row
    calculateTotalMicron(); // Recalculate totals
});

function calculateTotalGSMValue() {
    let totalGSM = 0;

    // Sum up all total-gsm-input values in the table
    document.querySelectorAll(".total-gsm-input").forEach(input => {
        const value = parseFloat(input.value) || 0; // Parse value or default to 0
        totalGSM += value;
    });

    // Update the total GSM calculated value field
    const totalGSMField = document.querySelector(".total-gsm-calculated-value");
    if (totalGSMField) {
        totalGSMField.value = totalGSM.toFixed(1); // Round to 2 decimal places
    }

    calculatePerKg();
    calculatePiecesPerKg();
    calculateSquareMeterPerKg();
    calculateLowerInput();
    calculateEstimatedKgReq();
    

}


function calculateLastCostM() {
    let totalGSMType2 = 0;
    let totalGSMSolventBase = 0;

    // Sum the total-gsm-input values where typeSelect = 2
    document.querySelectorAll("tr").forEach((row) => {
        const typeSelect = row.querySelector(".field-type select")?.value;
        const materialSelect = row.querySelector(".field-material select")?.value;
        const totalGSM = parseFloat(row.querySelector(".total-gsm-input")?.value || 0);

        // Sum where typeSelect = 2
        if (typeSelect === "2") {
            totalGSMType2 += totalGSM;
        }

        // Sum where materialSelect = Solvent Base
        if (materialSelect === "Solvent Base") {
            totalGSMSolventBase += totalGSM;
        }
    });

    // Get the value from total-gsm-last-value field
    const totalGSMLastValue = parseFloat(document.querySelector(".total-gsm-last-value")?.value || 0);

    // Get the value from cost-per-kg-last-value field
    const costPerKgLastValue = parseFloat(document.querySelector(".cost-per-kg-last-value")?.value || 0);

    // Calculate the sum of the two totals
    const sumOfGSM = totalGSMType2 + totalGSMSolventBase;

    // Perform the final calculation: (sumOfGSM / totalGSMLastValue) * costPerKgLastValue / 1000
    let estimatedKG = 0;
    if (totalGSMLastValue !== 0) {
        estimatedKG = (sumOfGSM / totalGSMLastValue) * costPerKgLastValue / 1000;
    }

    // Update the estimated-kg-req-input field with the calculated value
    const estimatedKGField = document.querySelector(".cost-m-last-field-tableless");
    if (estimatedKGField) {
        estimatedKGField.value = estimatedKG.toFixed(4); // Rounded to 4 decimal places
    }

    calculateTotalCostM();
}


document.querySelector(".total-gsm-last-value").addEventListener("input", function () {
    calculateLastCostM(); // Recalculate when total-gsm-last-value changes
});

document.querySelector(".cost-per-kg-last-value").addEventListener("input", function () {
    calculateLastCostM(); // Recalculate when cost-per-kg-last-value changes
});

calculateLastCostM();




function calculateSquareMeterPerKg() {
    // Get the total-gsm-calculated-value from the first element with the class 'total-gsm-calculated-value'
    const totalGSMCalculatedValue = parseFloat(document.querySelector(".total-gsm-calculated-value").value);

    // Get the square-meter-per-kg-input field (assuming it's within the same row or elsewhere in the DOM)
    const squareMeterPerKgInput = document.querySelector(".square-meter-per-kg-input");

    // Check if totalGSMCalculatedValue is valid (not NaN and not 0)
    if (!isNaN(totalGSMCalculatedValue) && totalGSMCalculatedValue !== 0) {
        // Calculate square-meter-per-kg by dividing 1000 by totalGSMCalculatedValue
        const squareMeterPerKg = (1000 / totalGSMCalculatedValue).toFixed(2);
        // Set the value to the square-meter-per-kg-input field
        squareMeterPerKgInput.value = squareMeterPerKg;
    } else {
        // If the totalGSMCalculatedValue is invalid, set the value to "0.0000"
        squareMeterPerKgInput.value = "0.00";
    }

    calculatePerSqm();
    calculateLinearMeterPerKg();
    calculateOrderQuantityInKgs();
    calculateLLinearMeterPerKg();
    calculateSecondSqm();
    calculateThirdPerSqm();
    calculateThirdPerLM();
    calculateFourthSqm();
    calculateFourthLm();
    calculateFifthSqm();
}

calculateSquareMeterPerKg();



function calculateTotalCostM() {
    // Get all elements with the class "cost-per-kg-input"
    const costPerKgInputs = document.querySelectorAll(".cost-m-input");
    // alert(costPerKgInputs);
    
    // Initialize the sum variable
    let totalCostPerKg = 0;

    // Sum the values of all cost-per-kg-input fields
    costPerKgInputs.forEach(input => {
        const value = parseFloat(input.value);
        if (!isNaN(value)) {
            totalCostPerKg += value;
        }
    });

    // Get the value of the "cost-m-last-field-tableless" field
    const lastCostMValue = parseFloat(document.querySelector(".cost-m-last-field-tableless").value);

    // Add the value of "cost-m-last-field-tableless" to the sum of cost-per-kg-input values
    if (!isNaN(lastCostMValue)) {
        totalCostPerKg += lastCostMValue;
    }

    // Set the calculated total in the "total-cost/m-value" field
    const totalCostMValueInput = document.querySelector(".total-cost-m-value");
    totalCostMValueInput.value = totalCostPerKg.toFixed(3);

    calculatePerKg();
}


calculateTotalCostM();



function calculateFilmDensityFromMicron() {
    // Get the value of total-gsm-calculated-value
    const totalGSMCalculatedValue = parseFloat(document.querySelector(".total-gsm-calculated-value").value);
    
    // Get the value of total-micron-input
    const totalMicronInput = parseFloat(document.querySelector(".total-micron-input").value);
    
    // Check if both values are valid numbers and total-micron-input is not zero
    if (!isNaN(totalGSMCalculatedValue) && !isNaN(totalMicronInput) && totalMicronInput !== 0) {
        // Calculate film density (total-gsm-calculated-value / total-micron-input)
        const filmDensity = totalGSMCalculatedValue / totalMicronInput;
        
        // Set the value of the film-density-input field
        const filmDensityInput = document.querySelector(".film-density-input");
        filmDensityInput.value = `${filmDensity.toFixed(3)} G/Cm³`;
    } else {
        // Set film-density-input field to "NaN G/Cm³" if the calculation is not valid
        const filmDensityInput = document.querySelector(".film-density-input");
        filmDensityInput.value = "0 G/Cm³";
    }

    calculateFilmOnRollWeight();
    calculateFilmOnRollLength();
    calculateCoreInsideRoll();
}



function calculateLowerInput() {
    // Loop through each row in the table
    document.querySelectorAll(".data-row").forEach(row => {
        // Get the Total GSM value from the current row
        const totalGSMInput = parseFloat(row.querySelector(".total-gsm-input")?.value || 0);

        // Get the Total GSM Calculated Value (it's located outside of the rows, but we need to get the single value)
        const totalGSMCalculatedValue = parseFloat(document.querySelector(".total-gsm-calculated-value")?.value || 0);

        // Perform the calculation if totalGSMCalculatedValue is not 0
        let lowerInput = 0;
        if (totalGSMCalculatedValue !== 0) {
            lowerInput = (totalGSMInput / totalGSMCalculatedValue) * 100;
        }

        // Set the calculated value in the lower-input field of the current row
        const lowerInputField = row.querySelector(".lower-input");
        if (lowerInputField) {
            lowerInputField.value = lowerInput.toFixed(2) + " %"; // Round to 2 decimal places
        }
    });
}


calculateLowerInput();



function calculatePerKg() {
    // Get the total-cost-m-value and total-gsm-calculated-value
    const totalCostMValue = parseFloat(document.querySelector(".total-cost-m-value")?.value || 0);
    const totalGSMCalculatedValue = parseFloat(document.querySelector(".total-gsm-calculated-value")?.value || 0);

    // Perform the calculation if totalGSMCalculatedValue is not 0
    let perKg = 0;
    if (totalGSMCalculatedValue !== 0) {
        perKg = (totalCostMValue / totalGSMCalculatedValue) * 1000;
    }

    // Update the per-kg-field with the calculated value, rounded to 2 decimal places
    const perKgField = document.querySelector(".per-kg-field");
    if (perKgField) {
        perKgField.value = perKg.toFixed(2); // Round to 2 decimal places
    }

    calculatePerSqm();
    calculatePerKpcs();
    calculatePerLM();
    calculateSecondPerKg();
    calculateLastKg();
    calculateFirstDifference();
    calculateEstimationTotalCost();

}




function calculatePerSqm() {
    // Get the per-kg-field and square-meter-per-kg-input values
    const perKgValue = parseFloat(document.querySelector(".per-kg-field")?.value || 0);
    const squareMeterPerKgValue = parseFloat(document.querySelector(".square-meter-per-kg-input")?.value || 0);

    // Perform the calculation if squareMeterPerKgValue is not 0
    let perSqm = 0;
    if (squareMeterPerKgValue !== 0) {
        perSqm = perKgValue / squareMeterPerKgValue;
    }

    // Update the per-sqm-field with the calculated value, rounded to 4 decimal places
    const perSqmField = document.querySelector(".per-sqm-field");
    if (perSqmField) {
        perSqmField.value = perSqm.toFixed(4); // Round to 4 decimal places
    }

    calculateLastSqm();
}


function updateExtrusionSpeed() {
    const inputField = document.querySelector(".extrusion-speed");

    // Get the value entered by the user
    let value = inputField.value.trim();

    // Remove any existing unit from the value (if the user has already typed some value)
    value = value.replace(" Kgs/Hr", "").trim();

    // Allow only numbers, so filter out any non-numeric characters
    value = value.replace(/[^0-9]/g, ""); // Remove non-numeric characters

    // If the value is not empty and is a valid number, update the field
    if (value && !isNaN(value)) {
        inputField.value = value + " Kgs/Hr"; // Append the unit
    } else if (value === "") {
        // If no input, reset the field to a default value
        inputField.value = "000 Kgs/Hr"; // Reset to default (optional)
    }
}

// Attach the event listener to the input field for "input" events
document.querySelector(".extrusion-speed").addEventListener("input", updateExtrusionSpeed);



// Function to handle the input change and update the display
function updateExtrusionSetupHour() {
    const inputField = document.querySelector(".extrusion-setup-hour");

    // Get the value entered by the user
    let value = inputField.value.trim();

    // Remove any non-numeric characters except for the decimal point
    value = value.replace(/[^0-9.]/g, "");

    // Ensure there is only one decimal point and at most one digit after the decimal
    const parts = value.split('.'); // Split the number by the decimal point
    if (parts.length > 2) {
        // If there are more than one decimal point, keep only the first part
        value = parts[0] + '.' + parts[1].substring(0, 1); // Allow only one digit after the decimal
    } else if (parts.length === 2 && parts[1].length > 1) {
        // If there's a decimal part, but more than one digit, truncate it to one digit
        value = parts[0] + '.' + parts[1].substring(0, 1);
    }

    // If the value is empty, reset it to "0.0"
    if (value === "") {
        value = "0.0";
    }

    // Update the input field with the value
    inputField.value = value;
}

// Attach the event listener to the input field for "input" events
document.querySelector(".extrusion-setup-hour").addEventListener("input", updateExtrusionSetupHour);



// Function to handle the input change and update the display
function printingSetupHour() {
    const inputField = document.querySelector(".printing-setup-hour");

    // Get the value entered by the user
    let value = inputField.value.trim();

    // Remove any non-numeric characters except for the decimal point
    value = value.replace(/[^0-9.]/g, "");

    // Ensure there is only one decimal point and at most one digit after the decimal
    const parts = value.split('.'); // Split the number by the decimal point
    if (parts.length > 2) {
        // If there are more than one decimal point, keep only the first part
        value = parts[0] + '.' + parts[1].substring(0, 1); // Allow only one digit after the decimal
    } else if (parts.length === 2 && parts[1].length > 1) {
        // If there's a decimal part, but more than one digit, truncate it to one digit
        value = parts[0] + '.' + parts[1].substring(0, 1);
    }

    // If the value is empty, reset it to "0.0"
    if (value === "") {
        value = "0.0";
    }

    // Update the input field with the value
    inputField.value = value;
}

// Attach the event listener to the input field for "input" events
document.querySelector(".printing-setup-hour").addEventListener("input", printingSetupHour);




// Function to handle the input change and update the display
function rewindingSetupHour() {
    const inputField = document.querySelector(".rewinding-setup-hour");

    // Get the value entered by the user
    let value = inputField.value.trim();

    // Remove any non-numeric characters except for the decimal point
    value = value.replace(/[^0-9.]/g, "");

    // Ensure there is only one decimal point and at most one digit after the decimal
    const parts = value.split('.'); // Split the number by the decimal point
    if (parts.length > 2) {
        // If there are more than one decimal point, keep only the first part
        value = parts[0] + '.' + parts[1].substring(0, 1); // Allow only one digit after the decimal
    } else if (parts.length === 2 && parts[1].length > 1) {
        // If there's a decimal part, but more than one digit, truncate it to one digit
        value = parts[0] + '.' + parts[1].substring(0, 1);
    }

    // If the value is empty, reset it to "0.0"
    if (value === "") {
        value = "0.0";
    }

    // Update the input field with the value
    inputField.value = value;
}

// Attach the event listener to the input field for "input" events
document.querySelector(".rewinding-setup-hour").addEventListener("input", rewindingSetupHour);


function laminationeSetup() {
    const inputField = document.querySelector(".lamination-1-setup-hour");

    // Get the value entered by the user
    let value = inputField.value.trim();

    // Remove any non-numeric characters except for the decimal point
    value = value.replace(/[^0-9.]/g, "");

    // Ensure there is only one decimal point and at most one digit after the decimal
    const parts = value.split('.'); // Split the number by the decimal point
    if (parts.length > 2) {
        // If there are more than one decimal point, keep only the first part
        value = parts[0] + '.' + parts[1].substring(0, 1); // Allow only one digit after the decimal
    } else if (parts.length === 2 && parts[1].length > 1) {
        // If there's a decimal part, but more than one digit, truncate it to one digit
        value = parts[0] + '.' + parts[1].substring(0, 1);
    }

    // If the value is empty, reset it to "0.0"
    if (value === "") {
        value = "0.0";
    }

    // Update the input field with the value
    inputField.value = value;
}

// Attach the event listener to the input field for "input" events
document.querySelector(".lamination-1-setup-hour").addEventListener("input", laminationeSetup);


function updatehour(event) {
        console.log("Triggered for:", event.target); // Debugging
        const inputField = event.target;

        let value = inputField.value.trim();
        value = value.replace(/[^0-9.]/g, "");
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts[1].substring(0, 1);
        } else if (parts.length === 2 && parts[1].length > 1) {
            value = parts[0] + '.' + parts[1].substring(0, 1);
        }
        if (value === "") {
            value = "0.0";
        }
        inputField.value = value;
    }

    // Attach to all elements with the class `.extrusion-setup-hour`
    const extrusionInputs = document.querySelectorAll(".update-hour");
    extrusionInputs.forEach(input => {
        input.addEventListener("input", updatehour);
    });






function updateSpeedField(event) {
    const inputField = event.target; // Get the input field that triggered the event

    // Get the value entered by the user
    let value = inputField.value.trim();

    // Remove any existing unit from the value (if the user has already typed some value)
    value = value.replace(" Mtr/Min", "").trim();

    // Allow only numbers, so filter out any non-numeric characters
    value = value.replace(/[^0-9]/g, ""); // Remove non-numeric characters

    // If the value is not empty and is a valid number, update the field
    if (value && !isNaN(value)) {
        inputField.value = value + " Mtr/Min"; // Append the unit
    } else if (value === "") {
        // If no input, reset the field to a default value (optional)
        inputField.value = "000 Mtr/Min"; // Reset to default (optional)
    }
}

// Attach the event listener to all elements with the class "speed-feild"
document.querySelectorAll(".speed-feild").forEach(inputField => {
    inputField.addEventListener("input", updateSpeedField);
});







function formatSetupHourField(event) {
    const inputField = event.target; // Get the input field that triggered the event

    // Get the value entered by the user
    let value = inputField.value.trim();

    // If the value is empty, set it to "0.0" as default
    if (value === "") {
        inputField.value = "0.0";
        return;
    }

    // Ensure the value has at most one digit after the decimal point
    // If the input value is a number, format it to one decimal place
    let formattedValue = parseFloat(value).toFixed(1);

    // Update the input field with the formatted value
    inputField.value = formattedValue;
}

// Attach the event listener to all elements with the class "setup-hour"
document.querySelectorAll(".setup-hour").forEach(inputField => {
    inputField.addEventListener("input", formatSetupHourField);
});


// Function to format the input fields to two decimal places



// Add event listeners to the input fields
document.querySelector(".roll-real-width").addEventListener("input", validateDecimalInput);
document.querySelector(".roll-cut-off").addEventListener("input", validateDecimalInput);



function calculatePiecesPerKg() {
    // Ensure 'productType' is set to the value from the dropdown
    const productType = document.querySelector("#productType").value;

    // Check if the productType is "roll"
    if (productType === "roll") {
        // Get the values from the relevant fields for roll
        const rollRealWidth = parseFloat(document.querySelector(".roll-real-width").value) || 0;
        const rollCutOff = parseFloat(document.querySelector(".roll-cut-off").value) || 0;
        const totalGsmCalculatedValue = parseFloat(document.querySelector(".total-gsm-calculated-value").value) || 0;
        const rollPiecesPerCut = parseFloat(document.querySelector(".roll-pieces-per-cut").value) || 0;

        // Ensure values are valid before calculation
        if (rollRealWidth > 0 && rollCutOff > 0 && totalGsmCalculatedValue > 0 && rollPiecesPerCut > 0) {
            // Apply the formula for "roll"
            const piecesPerKg = (1000 / (rollRealWidth * rollCutOff * totalGsmCalculatedValue * 0.001 * 0.001)) * rollPiecesPerCut;

            // Set the calculated value in the pieces-per-kg-field, rounding to 2 decimal places
            document.querySelector(".pieces-per-kg-field").value = Math.round(piecesPerKg).toLocaleString();

            // Calculate and set grams-per-piece
            const gramsPerPiece = (1000 / piecesPerKg).toFixed(2);
            document.querySelector(".grams-per-peice").value = gramsPerPiece;
        } else {
            // If values are invalid (zero or empty), set both fields to 0
            document.querySelector(".pieces-per-kg-field").value = "0";
            document.querySelector(".grams-per-peice").value = "0.00";
        }
    }
    // Check if the productType is "sleeve"
    else if (productType === "sleeve") {
        const CutOffValue = parseFloat(document.querySelector(".cut-off-value").value) || 0;
        const RealWidthValue = parseFloat(document.querySelector(".real-width-value").value) || 0;
        const totalGsmCalculatedValue = parseFloat(document.querySelector(".total-gsm-calculated-value").value) || 0;

        // Ensure values are valid before calculation
        if (RealWidthValue > 0 && CutOffValue > 0 && totalGsmCalculatedValue > 0) {
            const piecesPerKg = (1000 / (RealWidthValue * CutOffValue * totalGsmCalculatedValue * 0.001 * 0.001)) * 1;
            document.querySelector(".pieces-per-kg-field").value = Math.round(piecesPerKg).toLocaleString();

            // Calculate and set grams-per-piece
            const gramsPerPiece = (1000 / piecesPerKg).toFixed(2);
            document.querySelector(".grams-per-peice").value = gramsPerPiece;
        } else {
            document.querySelector(".pieces-per-kg-field").value = "0";
            document.querySelector(".grams-per-peice").value = "0.00";
        }
    }
    // Check if the productType is "bag-pouch"
    else if (productType === "bag-pouch") {
        const openWidth = parseFloat(document.querySelector(".open-width").value) || 0;
        const openHeight = parseFloat(document.querySelector(".open-height").value) || 0;
        const totalGsmCalculatedValue = parseFloat(document.querySelector(".total-gsm-calculated-value").value) || 0;

        if (openWidth > 0 && openHeight > 0 && totalGsmCalculatedValue > 0) {
            const piecesPerKg = (1000 / (openWidth * openHeight * totalGsmCalculatedValue * 0.001 * 0.001)) * 1;
            document.querySelector(".pieces-per-kg-field").value = Math.round(piecesPerKg).toLocaleString();

            // Calculate and set grams-per-piece
            const gramsPerPiece = (1000 / piecesPerKg).toFixed(2);
            document.querySelector(".grams-per-peice").value = gramsPerPiece;
        } else {
            document.querySelector(".pieces-per-kg-field").value = "0";
            document.querySelector(".grams-per-peice").value = "0.00";
        }
    }
    else {
        document.querySelector(".pieces-per-kg-field").value = "0";
        document.querySelector(".grams-per-peice").value = "0.00";
    }

    calculateOrderQuantityInKgs();
    calculateOrderQuanInKpieces();
    calculateSecondPerKps();
    calculateThirdKpcs();
    calculatePerKpcsFourth();
    calculateFifthKpcs();
    updatePiecesPerRoll();
    calculateZipperCostOneKg();
    calculatePerKpcs();
}


// Call the function when any of the required input fields change
document.querySelector(".roll-real-width").addEventListener("input", calculatePiecesPerKg);
document.querySelector(".roll-cut-off").addEventListener("input", calculatePiecesPerKg);
document.querySelector(".total-gsm-calculated-value").addEventListener("input", calculatePiecesPerKg);
document.querySelector(".roll-pieces-per-cut").addEventListener("input", calculatePiecesPerKg);
document.querySelector(".cut-off-value").addEventListener("input", calculatePiecesPerKg);
document.querySelector(".real-width-value").addEventListener("input", calculatePiecesPerKg);



// Function to format the value of the field to 2 decimal places
function formatToTwoDecimalPlaces() {
    // Get all elements with the class 'fixed-two'
    const fixedFields = document.querySelectorAll('.fixed-two');
    
    // Loop through each field and format its value
    fixedFields.forEach(function(field) {
        // Read the input value
        let value = parseFloat(field.value);
        
        // If value is a valid number, format it to two decimal places
        if (!isNaN(value)) {
            // Ensure that the value has exactly two decimal places
            field.value = value.toFixed(2);
        } else {
            // If the value is not a valid number, set it to '0.00'
            field.value = '0.00';
        }
    });
}

// Attach an event listener to all elements with class 'fixed-two' to detect changes
document.querySelectorAll('.fixed-two').forEach(function(field) {
    field.addEventListener('input', formatToTwoDecimalPlaces);
});



function calculatePrintingFilWidth() {
    // Get the product type (Roll, Sleeve, or Bag/Pouch)
    const productType = document.querySelector("#productType").value;
    
    let printingFilWidth = 0; // Initialize value

    if (productType === "roll") {
        // Get the values for "Roll"
        const rollRealWidth = parseFloat(document.querySelector(".roll-real-width").value) || 0;
        const numberOfUpsRoll = parseFloat(document.querySelector(".numberOfUpsRoll").value) || 0;
        const rollExtraPrintingTrim = parseFloat(document.querySelector(".roll-extra-printing-trim").value) || 0;

        // Apply the formula for Roll: (C13 * C17) + C15
        printingFilWidth = (rollRealWidth * numberOfUpsRoll) + rollExtraPrintingTrim;
        
    } else if (productType === "sleeve") {
        // Get the values for "Sleeve"
        const RealWidth = parseFloat(document.querySelector(".real-width-value").value) || 0;
        const numberOfUpsValue = parseFloat(document.querySelector(".number-of-ups-value").value) || 0;
        const extraPrintingTrimValue = parseFloat(document.querySelector(".extra-printing-trim-value").value) || 0;

        // Apply the formula for Sleeve: (G14 * G17) + G16
        printingFilWidth = (RealWidth * numberOfUpsValue) + extraPrintingTrimValue;
        
    } else if (productType === "bag-pouch") {
        // Get the values for "Bag/Pouch"
        const openWidth = parseFloat(document.querySelector(".open-width").value) || 0;
        const noOfUps = parseFloat(document.querySelector(".no_of_ups").value) || 0;
        const extraPrintingTrim = parseFloat(document.querySelector(".extra-printing-trim").value) || 0;

        // Apply the formula for Bag/Pouch: (K14 * K16) + K15
        printingFilWidth = (openWidth * noOfUps) + extraPrintingTrim;
    }

    // Set the calculated value in the printing-fil-width field
    document.querySelector(".printing-fil-width").value = Math.round(printingFilWidth).toLocaleString();
    calculateLinearMeterPerKg();
}

// Attach event listeners to the relevant fields
document.querySelector(".roll-real-width").addEventListener("input", calculatePrintingFilWidth);
document.querySelector(".numberOfUpsRoll").addEventListener("input", calculatePrintingFilWidth);
document.querySelector(".roll-extra-printing-trim").addEventListener("input", calculatePrintingFilWidth);
document.querySelector(".number-of-ups-value").addEventListener("input", calculatePrintingFilWidth);
document.querySelector(".extra-printing-trim-value").addEventListener("input", calculatePrintingFilWidth);
document.querySelector(".open-width").addEventListener("input", calculatePrintingFilWidth);
document.querySelector(".no_of_ups").addEventListener("input", calculatePrintingFilWidth);
document.querySelector(".roll-cut-off").addEventListener("input", calculatePrintingFilWidth);
document.querySelector(".roll-pieces-per-cut").addEventListener("input", calculatePrintingFilWidth);
document.querySelector(".lay-flat-value").addEventListener("input", calculatePrintingFilWidth);
document.querySelector(".cut-off-value").addEventListener("input", calculatePrintingFilWidth);
document.querySelector(".real-width-value").addEventListener("input", calculatePrintingFilWidth);
document.querySelector("#productType").addEventListener("change", function() {
    // Reset the printing-fil-width field when product type is changed
    document.querySelector(".printing-fil-width").value = "0.00"; 
});



function calculateLinearMeterPerKg() {
    // Get the values from square-meter-per-kg-input and printing-fil-width
    const squareMeterPerKg = parseFloat(document.querySelector(".square-meter-per-kg-input").value) || 0;
    const printingFilWidth = parseFloat(document.querySelector(".printing-fil-width").value.replace(/,/g, '')) || 0;

    // Ensure the values are valid before calculation
    if (squareMeterPerKg > 0 && printingFilWidth > 0) {
        // Apply the formula: (square-meter-per-kg-input / printing-fil-width) * 1000
        const linearMeterPerKg = (squareMeterPerKg / printingFilWidth) * 1000;
        console.log(squareMeterPerKg+'/'+printingFilWidth);

        // Set the calculated value in the linear-meter-per-kg field, rounding to 3 decimal places
        document.querySelector(".linear-meter-per-kg").value = linearMeterPerKg.toFixed(2);
    } else {
        // If values are invalid (zero or empty), set the field to 0
        document.querySelector(".linear-meter-per-kg").value = "0.00";
    }

    calculateOrderQuantityInKgs();
    calculateOrderQuanInMeter();
}

// Attach event listeners to the relevant fields
document.querySelector(".square-meter-per-kg-input").addEventListener("input", calculateLinearMeterPerKg);
document.querySelector(".printing-fil-width").addEventListener("input", calculateLinearMeterPerKg);



function calculateOrderQuantityInKgs() {
    // Get the selected unit
    const units = document.querySelector("#units").value;

    // Get the necessary fields
    const orderQuantity = parseFloat(document.querySelector(".orderQuantity").value.replace(/,/g, '')) || 0;
    const squareMeterPerKg = parseFloat(document.querySelector(".square-meter-per-kg-input").value) || 0;
    const gramsPerPiece = parseFloat(document.querySelector(".grams-per-peice").value) || 0;
    const linearMeterPerKg = parseFloat(document.querySelector(".linear-meter-per-kg").value) || 0;
    const hiddenField = parseFloat(document.querySelector(".hidden-field").value) || 0;

    let orderQuantityInKgs = 0; // Initialize value

    // Calculate based on the selected unit
    if (units === "kgs") {
        orderQuantityInKgs = orderQuantity;
    } else if (units === "sqm") {
        orderQuantityInKgs = orderQuantity / squareMeterPerKg;
    } else if (units === "kpcs") {
        orderQuantityInKgs = orderQuantity * gramsPerPiece;
    } else if (units === "lm") {
        orderQuantityInKgs = orderQuantity / hiddenField;
    }else if (units === "Roll 500 LM") {
        orderQuantityInKgs = (orderQuantity / hiddenField) * 500;
    }

    orderQuantityInKgs = isNaN(orderQuantityInKgs) ? 0 : orderQuantityInKgs;
    // Set the calculated value in the orderQuantityInKgs field
     document.querySelector(".orderQuantityInKgs").value = orderQuantityInKgs.toLocaleString();

     calculateOrderQuanInKpieces();
     calculateOrderQuanInMeter();
     calculateOutOperationCost();
     calculateEstimatedKgReq();
}

document.querySelector("#units").addEventListener("change", calculateOrderQuantityInKgs);
document.querySelector(".square-meter-per-kg-input").addEventListener("change", calculateOrderQuantityInKgs);
document.querySelector(".grams-per-peice").addEventListener("change", calculateOrderQuantityInKgs);
document.querySelector(".linear-meter-per-kg").addEventListener("change", calculateOrderQuantityInKgs);
document.querySelector(".orderQuantity").addEventListener("change", calculateOrderQuantityInKgs);
document.querySelector(".orderQuantity").addEventListener("input", calculateOrderQuantityInKgs);
document.querySelector(".units").addEventListener("change", calculateOrderQuantityInKgs);

function calculateOrderQuanInKpieces() {
    // Get necessary field values
    const orderQuantityInKgs = parseFloat(document.querySelector(".orderQuantityInKgs").value.replace(/,/g, "")) || 0;
    const gramsPerPiece = parseFloat(document.querySelector(".grams-per-peice").value) || 0;

    let orderQuanInKpieces = '00,000';

    // Ensure gramsPerPiece is not zero to avoid division by zero
    if (gramsPerPiece > 0) {
        // Apply the formula: (orderQuantityInKgs * 1000) / gramsPerPiece / 1000
        orderQuanInKpieces = (orderQuantityInKgs * 1000) / gramsPerPiece / 1000;
    }

    orderQuanInKpieces = isNaN(orderQuanInKpieces) ? 0 : orderQuanInKpieces;

    // Format the result with commas as thousands separators
    document.querySelector(".orderQuanInKpieces").value = Math.round(orderQuanInKpieces).toLocaleString();
    calculateQuantityZipperOne();
    calculateQuantityZipperTwo();
    calculatePouchSetupHour();
    

    
}


function calculateOrderQuanInMeter() {
    // Get the values of the required fields
    const orderQuantityInKgs = parseFloat(document.querySelector(".orderQuantityInKgs").value.replace(/,/g, "")) || 0;
    const linearMeterPerKg = parseFloat(document.querySelector(".linear-meter-per-kg").value) || 0;

    // Calculate the OrderQuanInMeter
    let orderQuanInMeter = orderQuantityInKgs * linearMeterPerKg;

    // Format the result with commas and set it in the input field
    document.querySelector(".OrderQuanInMeter").value = Math.round(orderQuanInMeter).toLocaleString();
    calculateSecondHour();
    calculateThirdHour();
    calculateFourthHour();
    calculateFifthHour();
    calculateSixHour();
    calculateSevenHour();
    calculateEightHour();
    calculateNineHour();
    calculateFinalValue();
}

// Attach the event listener to the relevant fields
document.querySelector(".orderQuantityInKgs").addEventListener("change", calculateOrderQuanInMeter);
document.querySelector(".linear-meter-per-kg").addEventListener("change", calculateOrderQuanInMeter);


// Function to calculate the Estimated KG Required for each row
function calculateEstimatedKgReq() {
    // Iterate over all rows
    document.querySelectorAll(".data-row").forEach(function (row) {
        const typeSelect = row.querySelector(".typeSelect").value;
        const orderQuantityInKgs = parseFloat(document.querySelector(".orderQuantityInKgs")?.value.replace(/,/g, '')) || 0;
        const totalGsmInput = parseFloat(row.querySelector(".total-gsm-input")?.value) || 0;
        const totalGsmCalculated = parseFloat(document.querySelector(".total-gsm-calculated-value")?.value) || 1;
        const wasteInput = parseFloat(row.querySelector(".waste-input")?.value) || 0; // Expecting 10 for 10%
        const micronInput = parseFloat(row.querySelector(".micron-input")?.value) || 0;
        const estimatedKgReqInput = row.querySelector(".estimated-kg-req-input");

        

        let estimatedKgReq = 0;

        // Convert wasteInput to decimal
        const wasteFactor = 1 + (wasteInput / 100);


        // Perform calculations based on typeSelect value
        if (typeSelect === "1") { // Substrate
            estimatedKgReq = ((orderQuantityInKgs * totalGsmInput) / totalGsmCalculated) * wasteFactor;
        } else if (typeSelect === "2" || typeSelect === "3") { // Ink or Adhesive
            estimatedKgReq = ((orderQuantityInKgs * micronInput) / totalGsmCalculated) * wasteFactor;
        }

        // Update the field value
        if (estimatedKgReqInput) {
            estimatedKgReqInput.value = Math.round(estimatedKgReq).toLocaleString(); // Limit to 2 decimal places
        }
    });

    calculateLastEstimatedKg();
}

// Attach event listeners to dynamically update calculations
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".typeSelect") || 
        event.target.matches(".orderQuantityInKgs") || 
        event.target.matches(".total-gsm-input") || 
        event.target.matches(".total-gsm-calculated-value") || 
        event.target.matches(".waste-input") || 
        event.target.matches(".micron-input") ||
        event.target.matches(".cost-per-kg-input")
    ) {
        calculateEstimatedKgReq();
    }
});

// Ensure calculations are updated when rows are dynamically added
document.addEventListener("click", function (event) {
    if (event.target.matches(".btn-add-row")) {
        calculateEstimatedKgReq();
    }
});



function calculateLastEstimatedKg() {
    let totalInk = 0;
    let totalSolventBase = 0;

    // Iterate over all rows
    document.querySelectorAll(".data-row").forEach(function (row) {
        const typeSelect = row.querySelector(".typeSelect").value;
        const materialSelect = row.querySelector("#materialSelect").value;
        const estimatedKgReqInput = row.querySelector(".estimated-kg-req-input");

        // Remove commas and parse as float
        const estimatedKgReq = parseFloat(estimatedKgReqInput.value.replace(/,/g, '')) || 0;
        

        // Add values based on conditions
        if (typeSelect == "2") { // TypeSelect is Ink (2)
            totalInk += estimatedKgReq;
            console.log(typeSelect + '  ' + totalInk);
        }

        if (materialSelect == "Solvent Base") { // MaterialSelect is Solvent Base
            totalSolventBase += estimatedKgReq;
        }
    });

    const totalGsmLastValue = parseFloat(document.querySelector(".total-gsm-last-value").value);

    // Sum of the two values
    const sumValues = totalInk + totalSolventBase;

    // Calculate final value by dividing the sum by total-gsm-last-value
    const lastEstimatedKg = sumValues * totalGsmLastValue;


    // Set the calculated value to the last-est-kg field
    const lastEstKgInput = document.querySelector(".last-est-kg");
    if (lastEstKgInput) {
        lastEstKgInput.value = Math.round(lastEstimatedKg).toLocaleString(); // Set the formatted value
    }
}


// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".typeSelect") || 
        event.target.matches("#materialSelect") || 
        event.target.matches(".total-gsm-last-value") || 
        event.target.matches(".estimated-kg-req-input")
    ) {
        calculateLastEstimatedKg();
    }
});


function calculatePerKpcs() {
    // Get the value of the per-kg-field and film-density-input fields
    const perKgField = parseFloat(document.querySelector(".per-kg-field").value) || 0;
    const filmDensityInput = parseFloat(document.querySelector(".pieces-per-kg-field").value) || 0; // Default to 1 to avoid division by zero

   

    // Calculate the value for perKpcs
    let perKpcsValue = (perKgField / filmDensityInput) * 1000;
    perKpcsValue = (!isFinite(perKpcsValue) || isNaN(perKpcsValue)) ? 0.00 : perKpcsValue;

    // Set the calculated value to the perKpcs field
    const perKpcsInput = document.querySelector(".perKpcs");
    if (perKpcsInput) {
        perKpcsInput.value = perKpcsValue.toFixed(2); // Format to 2 decimal places
    }

    calculateLastKpcs();
}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".per-kg-field") || 
        event.target.matches(".pieces-per-kg-field")
    ) {
        calculatePerKpcs();
    }
});



function calculatePerSqm() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const perKgField = parseFloat(document.querySelector(".per-kg-field").value) || 0;
    const totalGsmCalculatedValue = parseFloat(document.querySelector(".square-meter-per-kg-input").value) || 1; // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
    const perSqmValue = perKgField / totalGsmCalculatedValue;

    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".per-sqm-field");
    if (perSqmInput) {
        perSqmInput.value = perSqmValue.toFixed(2); // Format to 2 decimal places
    }
}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".per-kg-field") || 
        event.target.matches(".square-meter-per-kg-input")
    ) {
        calculatePerSqm();
    }
});



// calculate hidden value
function calculateLLinearMeterPerKg() {
    // Get the product type select field value
    const productType = document.querySelector("#productType").value;

    // Get the square-meter-per-kg-input value
    const squareMeterPerKgInput = parseFloat(document.querySelector(".square-meter-per-kg-input").value) || 0;

    // Initialize variables for different input values
    const rollRealWidth = parseFloat(document.querySelector(".roll-real-width").value) || 1; // Default to 1 to avoid division by zero
    const realWidthValue = parseFloat(document.querySelector(".real-width-value").value) || 1; // For sleeves
    const openHeight = parseFloat(document.querySelector(".open-height").value) || 1; // For bag-pouch

    // Linear meter per kg hidden field
    const linearMeterField = document.querySelector(".hidden-field");

    let linearMeterValue = 0;

    // Calculate based on product type
    if (productType === "roll") {
        linearMeterValue = (squareMeterPerKgInput / rollRealWidth) * 1000;
    } else if (productType === "sleeve") {
        linearMeterValue = (squareMeterPerKgInput / realWidthValue) * 1000;
    } else if (productType === "bag-pouch") {
        linearMeterValue = (squareMeterPerKgInput / openHeight) * 1000;
    }

    // Set the calculated value in the linear-meter-per-kg-hidden field
    if (linearMeterField) {
        linearMeterField.value = linearMeterValue.toFixed(2); // Format with thousand separators
    }

    calculateOrderQuantityInKgs();
    calculatePerLM();
    calculateSecondPerLm();
    calculateFifthLm();
    calculateFourthLm();
    calculateThirdPerLM();
}

// Add event listeners for when input or select fields change
document.addEventListener("input", function (event) {
    if (
        event.target.matches("#productType") || 
        event.target.matches(".square-meter-per-kg-input") || 
        event.target.matches(".roll-real-width") || 
        event.target.matches(".real-width-value") || 
        event.target.matches(".open-height")
    ) {
        calculateLLinearMeterPerKg();
    }
});

// Initial calculation on page load
document.addEventListener("DOMContentLoaded", calculateLLinearMeterPerKg);

// calculate per lm 

function calculatePerLM() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const perKgField = parseFloat(document.querySelector(".per-kg-field").value) || 0;
    const hiddenLinearMeterPerKg  = parseFloat(document.querySelector(".hidden-field").value) || 1; // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
     const perLmValue = perKgField / hiddenLinearMeterPerKg;

    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".perLmValue");
    if (perSqmInput) {
        perSqmInput.value = perLmValue.toFixed(4); // Format to 2 decimal places
    }

    calculateLastLm();
    calculateFirstPerRoll();
}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".per-kg-field") || 
        event.target.matches(".hidden-linear-meter-per-kg")
    ) {
        calculatePerLM();
    }
});

// calculate second per kg value
function calculateSecondPerKg() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const perKgField = parseFloat(document.querySelector(".per-kg-field").value) || 0;
    const markupPercent  = parseFloat(document.querySelector(".markupPercent").value); // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
     const perLmValue = (perKgField * markupPercent) / 100;

    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".second-per-kg-value");
    if (perSqmInput) {

        perSqmInput.value = perLmValue ? perLmValue.toFixed(2) : "0.00"; // Set empty if 0
    }

    calculateSecondPerKps();
    calculateSecondPerLm();
    calculateLastKg();
}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".per-kg-field") || 
        event.target.matches(".markupPercent")
    ) {
        calculateSecondPerKg();
    }
});


// calculate second per kpcs value
function calculateSecondPerKps() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const secondPerKg = parseFloat(document.querySelector(".second-per-kg-value").value) || 0;
    const PiecePerKg  = parseFloat(document.querySelector(".pieces-per-kg-field").value) || 0; // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
     let perLmValue = (secondPerKg / PiecePerKg) * 1000;
     perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;

    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".perKpcsSecond");
    if (perSqmInput) {
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
    }
    calculateSecondSqm();
    calculateLastKpcs();
}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".second-per-kg-value") || 
        event.target.matches(".pieces-per-kg-field")
    ) {
        calculateSecondPerKg();
    }
});


// calculate second per kpcs value
function calculateSecondSqm() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const secondPerKg = parseFloat(document.querySelector(".second-per-kg-value").value) || 0;
    const PiecePerKg  = parseFloat(document.querySelector(".square-meter-per-kg-input").value) || 0; // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
     let perLmValue = secondPerKg / PiecePerKg;

    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".secondPerSqm");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.0000 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(4); // Format to 2 decimal places
    }
    calculateLastSqm();
}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".second-per-kg-value") || 
        event.target.matches(".square-meter-per-kg-input")
    ) {
        calculateSecondSqm();
    }
});



function calculateSecondPerLm() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const secondPerKg = parseFloat(document.querySelector(".second-per-kg-value").value) || 0;
    const PiecePerKg  = parseFloat(document.querySelector(".hidden-field").value) || 0; // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
     let perLmValue = secondPerKg / PiecePerKg;


    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".secondPerLM");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.0000 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(4); // Format to 2 decimal places
    }

    calculateLastLm();
    calculateSecondPerRoll();

}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".second-per-kg-value") || 
        event.target.matches(".hidden-field")
    ) {
        calculateSecondPerLm();
    }
});



function calculateThirdKpcs() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const thirdPerKg = parseFloat(document.querySelector(".third-per-kg-value").value) || 0;
    const PiecePerKg  = parseFloat(document.querySelector(".pieces-per-kg-field").value) || 0; // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
     let perLmValue = (thirdPerKg / PiecePerKg) * 1000;


    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".perKpcsthird");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
    }

    calculateLastKpcs();
}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".third-per-kg-value") || 
        event.target.matches(".pieces-per-kg-field")
    ) {
        calculateThirdKpcs();
    }
});



function calculateThirdPerSqm() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const thirdPerKg = parseFloat(document.querySelector(".third-per-kg-value").value) || 0;
    const PiecePerKg  = parseFloat(document.querySelector(".square-meter-per-kg-input").value) || 0; // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
     let perLmValue = thirdPerKg / PiecePerKg;


    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".ThirdPerSqm");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(4); // Format to 2 decimal places
    }

    calculateLastSqm();

}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".third-per-kg-value") || 
        event.target.matches(".square-meter-per-kg-input")
    ) {
        calculateThirdPerSqm();
    }
});


function calculateThirdPerLM() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const thirdPerKg = parseFloat(document.querySelector(".third-per-kg-value").value) || 0;
    const PiecePerKg  = parseFloat(document.querySelector(".hidden-field").value) || 0; // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
     let perLmValue = thirdPerKg / PiecePerKg;


    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".thirdPerLM");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.0000 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(4); // Format to 2 decimal places
    }

    calculateLastLm();
    calculateThirdPerRoll();

}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".third-per-kg-value") || 
        event.target.matches(".hidden-field")
    ) {
        calculateThirdPerLM();
    }
});



function calculatePerKpcsFourth() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const thirdPerKg = parseFloat(document.querySelector(".fourth-per-kg").value) || 0;
    const PiecePerKg  = parseFloat(document.querySelector(".pieces-per-kg-field").value) || 0; // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
     let perLmValue = (thirdPerKg / PiecePerKg) * 1000;


    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".perkpcsfourth");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
    }

    calculateLastKpcs();

}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".fourth-per-kg") || 
        event.target.matches(".pieces-per-kg-field")
    ) {
        calculatePerKpcsFourth();
    }
});



function calculateFourthSqm() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const thirdPerKg = parseFloat(document.querySelector(".fourth-per-kg").value) || 0;
    const PiecePerKg  = parseFloat(document.querySelector(".square-meter-per-kg-input").value) || 0; // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
     let perLmValue = thirdPerKg / PiecePerKg;


    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".fourthPerSqm");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.0000 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(4); // Format to 2 decimal places
    }

    calculateLastSqm();

}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".fourth-per-kg") || 
        event.target.matches(".square-meter-per-kg-input")
    ) {
        calculateFourthSqm();
    }
});



function calculateFourthLm() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const thirdPerKg = parseFloat(document.querySelector(".fourth-per-kg").value) || 0;
    const PiecePerKg  = parseFloat(document.querySelector(".hidden-field").value) || 0; // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
    let perLmValue = thirdPerKg / PiecePerKg;


    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".fourthLm");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(4); // Format to 2 decimal places
    }

    calculateLastLm();
    calculateFourthPerRoll();	

}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".fourth-per-kg") || 
        event.target.matches(".hidden-field")
    ) {
        calculateFourthLm();
    }
});



function calculateFifthKpcs() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const thirdPerKg = parseFloat(document.querySelector(".fifth-per-kg").value) || 0;
    const PiecePerKg  = parseFloat(document.querySelector(".pieces-per-kg-field").value) || 0; // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
    let perLmValue = (thirdPerKg / PiecePerKg) * 1000;


    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".fifth-kpcs");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
    }

    calculateLastKpcs();

}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".fifth-per-kg") || 
        event.target.matches(".pieces-per-kg-field")
    ) {
        calculateFifthKpcs();
    }
});


function calculateFifthSqm() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const thirdPerKg = parseFloat(document.querySelector(".fifth-per-kg").value) || 0;
    const PiecePerKg  = parseFloat(document.querySelector(".square-meter-per-kg-input").value) || 0; // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
    let perLmValue = thirdPerKg / PiecePerKg;


    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".fifth-sqm");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(4); // Format to 2 decimal places
    }

    calculateLastSqm();

}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".fifth-per-kg") || 
        event.target.matches(".square-meter-per-kg-input")
    ) {
        calculateFifthSqm();
    }
});


function calculateFifthLm() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const thirdPerKg = parseFloat(document.querySelector(".fifth-per-kg").value) || 0;
    const PiecePerKg  = parseFloat(document.querySelector(".hidden-field").value) || 0; // Default to 1 to avoid division by zero

    // Calculate the value for per-sqm-field
    let perLmValue = thirdPerKg / PiecePerKg;


    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".fifth-lm");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.0000 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(4); // Format to 2 decimal places
    }

    calculateLastLm();
    calculateFifthPerRoll();

}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".fifth-per-kg") || 
        event.target.matches(".hidden-field")
    ) {
        calculateFifthLm();
    }
});


function calculateLastKg() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const firstKg = parseFloat(document.querySelector(".per-kg-field").value) || 0;
    const secondKg  = parseFloat(document.querySelector(".second-per-kg-value").value) || 0;
    const thirdKg  = parseFloat(document.querySelector(".third-per-kg-value").value) || 0;
    const fourthKg  = parseFloat(document.querySelector(".fourth-per-kg").value) || 0;
    const fifthKg  = parseFloat(document.querySelector(".fifth-per-kg").value) || 0;


    // Calculate the value for per-sqm-field
    const perLmValue = firstKg+secondKg+thirdKg+fourthKg+fifthKg ;


    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".six-kg");
    const lastSalesInput = document.querySelector(".lastSalesPrice");
      if (perSqmInput) {
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
        lastSalesInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
        calculateEstimatedMargin();
        calculateActualMargin();
        calculatefirstPercentage();
        calculatesecondPercentage();
        calculatethirdPercentage();
        calculatefourthPercentage();
        
    }

}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".per-kg-field") || 
        event.target.matches(".third-per-kg-value") || 
        event.target.matches(".fourth-per-kg") || 
        event.target.matches(".fifth-per-kg") || 
        event.target.matches(".second-per-kg-value")
    ) {
        calculateLastKg();
    }
});



function calculateLastKpcs() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const firstKg = parseFloat(document.querySelector(".perKpcs").value) || 0;
    const secondKg  = parseFloat(document.querySelector(".perKpcsSecond").value) || 0;
    const thirdKg  = parseFloat(document.querySelector(".perKpcsthird").value) || 0;
    const fourthKg  = parseFloat(document.querySelector(".perkpcsfourth").value) || 0;
    const fifthKg  = parseFloat(document.querySelector(".fifth-kpcs").value) || 0;


    // Calculate the value for per-sqm-field
    const perLmValue = firstKg+secondKg+thirdKg+fourthKg+fifthKg ;


    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".six-kpcs");
    if (perSqmInput) {
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
    }

}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".perKpcs") || 
        event.target.matches(".perKpcsSecond") || 
        event.target.matches(".perKpcsthird") || 
        event.target.matches(".perkpcsfourth") || 
        event.target.matches(".fifth-kpcs")
    ) {
        calculateLastKpcs();
    }
});



function calculateLastSqm() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const firstKg = parseFloat(document.querySelector(".per-sqm-field").value) || 0;
    const secondKg  = parseFloat(document.querySelector(".secondPerSqm").value) || 0;
    const thirdKg  = parseFloat(document.querySelector(".ThirdPerSqm").value) || 0;
    const fourthKg  = parseFloat(document.querySelector(".fourthPerSqm").value) || 0;
    const fifthKg  = parseFloat(document.querySelector(".fifth-sqm").value) || 0;


    // Calculate the value for per-sqm-field
    const perLmValue = firstKg+secondKg+thirdKg+fourthKg+fifthKg ;


    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".six-sqm");
    if (perSqmInput) {
        perSqmInput.value = perLmValue.toFixed(4); // Format to 2 decimal places
    }

}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".per-sqm-field") || 
        event.target.matches(".secondPerSqm") || 
        event.target.matches(".ThirdPerSqm") || 
        event.target.matches(".fourthPerSqm") || 
        event.target.matches(".fifth-sqm")
    ) {
        calculateLastSqm();
    }
});



function calculateLastLm() {
    // Get the value of the per-kg-field and total-gsm-calculated-value fields
    const firstKg = parseFloat(document.querySelector(".perLmValue").value) || 0;
    const secondKg  = parseFloat(document.querySelector(".secondPerLM").value) || 0;
    const thirdKg  = parseFloat(document.querySelector(".thirdPerLM").value) || 0;
    const fourthKg  = parseFloat(document.querySelector(".fourthLm").value) || 0;
    const fifthKg  = parseFloat(document.querySelector(".fifth-lm").value) || 0;


    // Calculate the value for per-sqm-field
    const perLmValue = firstKg+secondKg+thirdKg+fourthKg+fifthKg ;


    // Set the calculated value to the per-sqm-field
    const perSqmInput = document.querySelector(".six-lm");
    if (perSqmInput) {
        perSqmInput.value = perLmValue.toFixed(4); // Format to 2 decimal places
    }

}

// Trigger calculation when relevant fields are changed or updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".perLmValue") || 
        event.target.matches(".secondPerLM") || 
        event.target.matches(".thirdPerLM") || 
        event.target.matches(".fourthLm") || 
        event.target.matches(".fifth-lm")
    ) {
        calculateLastSqm();
    }
});








function calculateFinalValue() {
    // Get the value of the first setup (D61)
    const firstSetup = parseFloat(document.querySelector(".first-setup")?.value) || 0;

    // Initialize sums for LDPE Transparent and LDPE White
    let sumLDPETransparent = 0;
    let sumLDPEWhite = 0;
    let estimatedKgReq = 0;

    // Get the table by the correct ID
    const table = document.getElementById("materialcosttable");

    // Iterate over all rows in the table to find inputs with the required conditions
    table.querySelectorAll("tr.data-row").forEach(row => {
        const materialSelect = row.querySelector("#materialSelect").value; // Material type
        const estimatedKgReqInput = row.querySelector(".estimated-kg-req-input");

        // Check if the element exists and has a value
        if (estimatedKgReqInput && estimatedKgReqInput.value) {
            const rawValue = estimatedKgReqInput.value.replace(/,/g, ''); // Remove commas
            estimatedKgReq = parseFloat(rawValue) || 0;
        } else {
            estimatedKgReq = 0; // Default to 0 if the input is missing or empty
        }

        // Add to respective sums based on material type
        if (materialSelect === "LDPE Transparent") {
            sumLDPETransparent += estimatedKgReq;
        } else if (materialSelect === "LDPE White") {
            sumLDPEWhite += estimatedKgReq;
        }
    });

    // Calculate the total sum of LDPE Transparent and LDPE White
    const totalSum = sumLDPETransparent + sumLDPEWhite;

    // Get the value of the first speed (C61)
    const firstSpeed = parseFloat(document.querySelector(".first-speed")?.value); // Default to 1 to avoid division by zero
    

    // Calculate the final result using the formula
    let finalValue = Math.round(firstSetup + (totalSum / firstSpeed));  // Round to nearest integer
    finalValue = (!isFinite(finalValue) || isNaN(finalValue)) ? 0.00 : finalValue;

    // Set the calculated value to the output field (update as per your requirement)
    const outputField = document.querySelector(".first-hour");
    if (outputField) {

        outputField.value = finalValue.toFixed(2); // No need for toFixed here if you want to use the rounded integer
    }

    calculateLastEstimatedKg();
}


// Attach the event listener to input fields
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".first-setup") ||
        event.target.matches(".estimated-kg-req-input") ||
        event.target.matches(".first-speed") ||
        event.target.matches("[name='materialSelect']") ||
        event.target.matches(".OrderQuanInMeter")
    ) {
        calculateFinalValue();
    }
});



function calculateSecondHour() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".second-setup")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".second-speed")?.value.replace(/,/g, '')) || 0;
    const OrderQuanInMeter = parseFloat(document.querySelector(".OrderQuanInMeter")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    const divisionResult = OrderQuanInMeter / secondSpeed;
    const divisionBy60 = divisionResult / 60;
    let  perLmValue = secondSetup + divisionBy60;
    

    // Set the calculated value


    const perSqmInput = document.querySelector(".second-hour");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
    }
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".second-setup") || 
        event.target.matches(".OrderQuanInMeter") ||
        event.target.matches(".second-speed") 
    ) {
        calculateSecondHour();
    }
});


function calculateThirdHour() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".third-setup")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".third-speed")?.value.replace(/,/g, '')) || 0;
    const OrderQuanInMeter = parseFloat(document.querySelector(".OrderQuanInMeter")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    const divisionResult = OrderQuanInMeter / secondSpeed;
    const divisionBy60 = divisionResult / 60;
    let perLmValue = secondSetup + divisionBy60;
    

    // Set the calculated value
    const perSqmInput = document.querySelector(".third-hour");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
    }
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".third-setup") || 
        event.target.matches(".OrderQuanInMeter") ||
        event.target.matches(".third-speed") 
    ) {
        calculateThirdHour();
    }
});


function calculateFourthHour() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".fourth-setup")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".fourth-speed")?.value.replace(/,/g, '')) || 0;
    const OrderQuanInMeter = parseFloat(document.querySelector(".OrderQuanInMeter")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    const divisionResult = OrderQuanInMeter / secondSpeed;
    const divisionBy60 = divisionResult / 60;
    let perLmValue = secondSetup + divisionBy60;
    

    // Set the calculated value
    const perSqmInput = document.querySelector(".fourth-hour");
    if (perSqmInput) {

        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
    }
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".fourth-setup") || 
        event.target.matches(".OrderQuanInMeter") ||
        event.target.matches(".fourth-speed") 
    ) {
        calculateFourthHour();
    }
});


function calculateFifthHour() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".fifth-setup")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".fifth-speed")?.value.replace(/,/g, '')) || 0;
    const OrderQuanInMeter = parseFloat(document.querySelector(".OrderQuanInMeter")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    const divisionResult = OrderQuanInMeter / secondSpeed;
    const divisionBy60 = divisionResult / 60;
    let perLmValue = secondSetup + divisionBy60;
    

    // Set the calculated value
    const perSqmInput = document.querySelector(".fifth-hour");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
    }
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".fifth-setup") || 
        event.target.matches(".OrderQuanInMeter") ||
        event.target.matches(".fifth-speed") 
    ) {
        calculateFifthHour();
    }
});



function calculateSixHour() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".six-setup")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".six-speed")?.value.replace(/,/g, '')) || 0;
    const OrderQuanInMeter = parseFloat(document.querySelector(".OrderQuanInMeter")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    const divisionResult = OrderQuanInMeter / secondSpeed;
    const divisionBy60 = divisionResult / 60;
    let perLmValue = secondSetup + divisionBy60;
    

    // Set the calculated value
    const perSqmInput = document.querySelector(".six-hour");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
    }
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".six-setup") || 
        event.target.matches(".OrderQuanInMeter") ||
        event.target.matches(".six-speed") 
    ) {
        calculateSixHour();
    }
});


function calculateSevenHour() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".seven-setup")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".seven-speed")?.value.replace(/,/g, '')) || 0;
    const OrderQuanInMeter = parseFloat(document.querySelector(".OrderQuanInMeter")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    const divisionResult = OrderQuanInMeter / secondSpeed;
    const divisionBy60 = divisionResult / 60;
    let perLmValue = secondSetup + divisionBy60;
    

    // Set the calculated value
    const perSqmInput = document.querySelector(".seven-hour");
    if (perSqmInput) {

        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
    }
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".seven-setup") || 
        event.target.matches(".OrderQuanInMeter") ||
        event.target.matches(".seven-speed") 
    ) {
        calculateSevenHour();
    }
});



function calculateEightHour() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".eight-setup")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".eight-speed")?.value.replace(/,/g, '')) || 0;
    const OrderQuanInMeter = parseFloat(document.querySelector(".OrderQuanInMeter")?.value.replace(/,/g, '')) || 0;
    const upsVal = parseFloat(document.querySelector(".number-of-ups-value")?.value) || 0;
    

    // Calculate the value
    const divisionResult = (OrderQuanInMeter * upsVal) / secondSpeed;
    const divisionBy60 = divisionResult / 60;
    let perLmValue = secondSetup + divisionBy60;
    

    // Set the calculated value
    const perSqmInput = document.querySelector(".eight-hour");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
    }
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".eight-setup") || 
        event.target.matches(".OrderQuanInMeter") ||
        event.target.matches(".number-of-ups-value") ||
        event.target.matches(".eight-speed") 
    ) {
        calculateEightHour();
    }
});



function calculateNineHour() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".nine-setup")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".nine-speed")?.value.replace(/,/g, '')) || 0;
    const OrderQuanInMeter = parseFloat(document.querySelector(".OrderQuanInMeter")?.value.replace(/,/g, '')) || 0;
    const upsVal = parseFloat(document.querySelector(".number-of-ups-value")?.value) || 0;

    // Calculate the value
    const divisionResult = (OrderQuanInMeter * upsVal) / secondSpeed;
    const divisionBy60 = divisionResult / 60;
    let perLmValue = secondSetup + divisionBy60;
    

    // Set the calculated value
    const perSqmInput = document.querySelector(".nine-hour");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
    }
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".nine-setup") || 
        event.target.matches(".OrderQuanInMeter") ||
        event.target.matches(".number-of-ups-value") ||
        event.target.matches(".nine-speed") 
    ) {
        calculateNineHour();
    }
});



function calculateFirstProcess() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".first-process-cost")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".first-hour")?.value.replace(/,/g, '')) || 0;
    // Calculate the value
    let divisionResult = secondSetup * secondSpeed;
    divisionResult = (!isFinite(divisionResult) || isNaN(divisionResult)) ? 0 : divisionResult;

    // Round the total cost to remove decimals
    divisionResult = Math.round(divisionResult);

    // Set the calculated value
    const perSqmInput = document.querySelector(".process-cost-one");
    if (perSqmInput) {
        perSqmInput.value = divisionResult.toLocaleString(undefined, { maximumFractionDigits: 0 }); // No decimals

    }
    calculateTotalCost();
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".first-process-cost") || 
        event.target.matches(".first-hour") ||
        event.target.matches(".first-setup") 
        
    ) {
        calculateFirstProcess();
    }
});




function calculateSecondProcess() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".second-process-cost")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".second-hour")?.value.replace(/,/g, '')) || 0;
    // Calculate the value
    let divisionResult = secondSetup * secondSpeed;
    
    divisionResult = (!isFinite(divisionResult) || isNaN(divisionResult)) ? 0 : divisionResult;
    
    divisionResult = Math.round(divisionResult);

    // Set the calculated value
    const perSqmInput = document.querySelector(".process-cost-two");
    if (perSqmInput) {
        perSqmInput.value = divisionResult.toLocaleString(undefined, { maximumFractionDigits: 0 }); // No decimals

    }
    calculateTotalCost();
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".second-process-cost") || 
        event.target.matches(".second-hour") ||
        event.target.matches(".second-setup")
        
    ) {
        calculateSecondProcess();
    }
});



function calculateThirdProcess() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".third-process-cost")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".third-hour")?.value.replace(/,/g, '')) || 0;
    // Calculate the value
    let divisionResult = secondSetup * secondSpeed;
    divisionResult = (!isFinite(divisionResult) || isNaN(divisionResult)) ? 0 : divisionResult;
    
    divisionResult = Math.round(divisionResult);

    // Set the calculated value
    const perSqmInput = document.querySelector(".process-cost-three");
    if (perSqmInput) {
        perSqmInput.value = divisionResult.toLocaleString(undefined, { maximumFractionDigits: 0 }); // No decimals

    }
    calculateTotalCost();
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".third-process-cost") || 
        event.target.matches(".third-hour") ||
        event.target.matches(".third-setup")
        
    ) {
        calculateThirdProcess();
    }
});


function calculateFourthProcess() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".fourth-process-cost")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".fourth-hour")?.value.replace(/,/g, '')) || 0;
    // Calculate the value
    let divisionResult = secondSetup * secondSpeed;
    divisionResult = (!isFinite(divisionResult) || isNaN(divisionResult)) ? 0 : divisionResult;
    
    divisionResult = Math.round(divisionResult);

    // Set the calculated value
    const perSqmInput = document.querySelector(".process-cost-four");
    if (perSqmInput) {
        perSqmInput.value = divisionResult.toLocaleString(undefined, { maximumFractionDigits: 0 }); // No decimals
    }
    calculateTotalCost();
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".fourth-process-cost") || 
        event.target.matches(".fourth-hour") ||
        event.target.matches(".fourth-setup")
        
    ) {
        calculateFourthProcess();
    }
});



function calculateFifthProcess() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".fifth-process-cost")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".fifth-hour")?.value.replace(/,/g, '')) || 0;
    // Calculate the value
    let divisionResult = secondSetup * secondSpeed;
    divisionResult = (!isFinite(divisionResult) || isNaN(divisionResult)) ? 0.00 : divisionResult;
    
    divisionResult = Math.round(divisionResult);
    // Set the calculated value
    const perSqmInput = document.querySelector(".process-cost-fifth");
    if (perSqmInput) {
        perSqmInput.value = divisionResult.toLocaleString(undefined, { maximumFractionDigits: 0 }); // No decimals
    }
    calculateTotalCost();
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".fifth-process-cost") || 
        event.target.matches(".fifth-hour") ||
        event.target.matches(".fifth-setup")
    ) {
        calculateFifthProcess();
    }
});



function calculateSixProcess() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".six-process-cost")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".six-hour")?.value.replace(/,/g, '')) || 0;
    // Calculate the value
    let divisionResult = secondSetup * secondSpeed;
    divisionResult = (!isFinite(divisionResult) || isNaN(divisionResult)) ? 0 : divisionResult;
    
    divisionResult = Math.round(divisionResult);
    // Set the calculated value
    const perSqmInput = document.querySelector(".process-cost-six");
    if (perSqmInput) {
        perSqmInput.value = divisionResult.toLocaleString(undefined, { maximumFractionDigits: 0 }); // No decimals
    }

    calculateTotalCost();
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".six-process-cost") || 
        event.target.matches(".six-hour") || 
        event.target.matches(".six-setup")
    ) {
        calculateSixProcess();
    }
});



function calculateSevenProcess() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".seven-process-cost")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".seven-hour")?.value.replace(/,/g, '')) || 0;
    // Calculate the value
    let divisionResult = secondSetup * secondSpeed;
    divisionResult = (!isFinite(divisionResult) || isNaN(divisionResult)) ? 0.00 : divisionResult;

    divisionResult = Math.round(divisionResult);
    // Set the calculated value
    const perSqmInput = document.querySelector(".process-cost-seven");
    if (perSqmInput) {
        perSqmInput.value = divisionResult.toLocaleString(undefined, { maximumFractionDigits: 0 }); // No decimals
    }
    calculateTotalCost();
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".seven-process-cost") || 
        event.target.matches(".seven-hour") ||
        event.target.matches(".seven-setup")
    ) {
        calculateSevenProcess();
    }
});


function calculateEightProcess() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".eight-process-cost")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".eight-hour")?.value.replace(/,/g, '')) || 0;
    // Calculate the value
    let divisionResult = secondSetup * secondSpeed;
    divisionResult = (!isFinite(divisionResult) || isNaN(divisionResult)) ? 0.00 : divisionResult;
    divisionResult = Math.round(divisionResult);

    // Set the calculated value
    const perSqmInput = document.querySelector(".process-cost-eight");
    if (perSqmInput) {
        perSqmInput.value = divisionResult.toLocaleString(undefined, { maximumFractionDigits: 0 }); // No decimals
    }

    calculateTotalCost();
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".eight-process-cost") || 
        event.target.matches(".eight-hour") ||
        event.target.matches(".eight-setup") 
    ) {
        calculateEightProcess();
    }
});



function calculateNineProcess() {
    // Get input values
    const secondSetup = parseFloat(document.querySelector(".nine-process-cost")?.value.replace(/,/g, '')) || 0;
    const secondSpeed = parseFloat(document.querySelector(".nine-hour")?.value.replace(/,/g, '')) || 0;
    // Calculate the value
    let divisionResult = secondSetup * secondSpeed;
    divisionResult = (!isFinite(divisionResult) || isNaN(divisionResult)) ? 0.00 : divisionResult;
    divisionResult = Math.round(divisionResult);

    // Set the calculated value
    const perSqmInput = document.querySelector(".process-cost-nine");
    if (perSqmInput) {
        perSqmInput.value = divisionResult.toLocaleString(undefined, { maximumFractionDigits: 0 }); // No decimals
    }

    calculateTotalCost();
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".nine-process-cost") || 
        event.target.matches(".nine-hour") ||
        event.target.matches(".nine-setup")
    ) {
        calculateNineProcess();
    }
});




// Function to calculate total cost
function calculateTotalCost() {
    let totalCost = 0;

    // Loop through each checkbox
    document.querySelectorAll('.checkbox-field input[type="checkbox"]').forEach(function (checkbox) {
        if (checkbox.checked) {
            // Get the corresponding process-cost-field
            const processCostField = checkbox.closest('tr').querySelector('.process-cost-field');
            if (processCostField) {
                // Add the value to the total (convert to number)
                totalCost += parseFloat(processCostField.value.replace(',', '') || 0);
            }
        }
    });


    // Round the total cost to remove decimals
    totalCost = Math.round(totalCost);

    // Update the total-process-cost field
    const totalCostField = document.querySelector('.total-process-cost');
    if (totalCostField) {
        totalCost = (!isFinite(totalCost) || isNaN(totalCost)) ? 0 : totalCost;
        totalCostField.value = totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 }); // No decimals
    }
    calculateOutOperationCost();
}

// Add event listener to all checkboxes
document.querySelectorAll('.checkbox-field input[type="checkbox"]').forEach(function (checkbox) {
    checkbox.addEventListener('change', calculateTotalCost);
});

// Initial calculation on page load (if any checkboxes are pre-checked)
document.addEventListener('DOMContentLoaded', calculateTotalCost);



function calculateFilmOnRollWeight() {
  // Get the productType value
  var productType = document.getElementById('productType').value;
  
  // Get the common values
  var rollOutsideDiameter = parseFloat(document.querySelector('.roll-outside-diameter').value) || 0;
  var coreInside = parseFloat(document.querySelector('.core-inside').value) || 0;
  var filmDensity = parseFloat(document.querySelector('.film-density-input').value) || 0;

  // Declare a variable to hold the result of the calculation
  var weight = 0;

  // Check if productType is "roll"
  if (productType === "roll") {
    var rollRealWidth = parseFloat(document.querySelector('.roll-real-width').value) || 0;
    weight = (((rollOutsideDiameter / 2) ** 2 - (coreInside / 2) ** 2) * Math.PI * rollRealWidth * filmDensity) / 1000000;

  // Check if productType is "sleeve"
  } else if (productType === "sleeve") {
    var rollRealWidth = parseFloat(document.querySelector('.real-width-value').value) || 0;
    weight = (((rollOutsideDiameter / 2) ** 2 - (coreInside / 2) ** 2) * Math.PI * rollRealWidth * filmDensity) / 1000000;

  // Check if productType is "bag-pouch"
  } else if (productType === "bag-pouch") {
    var openHeight = parseFloat(document.querySelector('.open-height').value) || 0;
    weight = (((rollOutsideDiameter / 2) ** 2 - (coreInside / 2) ** 2) * Math.PI * openHeight * filmDensity) / 1000000;
  }
  
  weight = isNaN(weight) ? 0 : weight;
  // Update the value of the input with class 'film-on-roll-weight'
  document.querySelector('.film-on-roll-weight').value = Math.round(weight).toLocaleString();
 // You can adjust decimal places as needed
 calculateFilmOnRollLength();
 updatePiecesPerRoll();
}

// Add event listeners to update the calculation whenever values change
document.querySelector('.roll-outside-diameter').addEventListener('input', calculateFilmOnRollWeight);
document.querySelector('.core-inside').addEventListener('input', calculateFilmOnRollWeight);
document.querySelector('.roll-real-width').addEventListener('input', calculateFilmOnRollWeight);
document.querySelector('.film-density-input').addEventListener('input', calculateFilmOnRollWeight);
document.querySelector('.open-height').addEventListener('input', calculateFilmOnRollWeight);
document.getElementById('productType').addEventListener('change', calculateFilmOnRollWeight);

// Initial calculation on page load
calculateFilmOnRollWeight();



function calculateFilmOnRollLength() {
  // Get the productType value
  var productType = document.getElementById('productType').value;

  // Get the common values
  var filmOnRollWeight = parseFloat(document.querySelector('.film-on-roll-weight').value.replace(/,/g, '')) || 0;
  var filmDensity = parseFloat(document.querySelector('.film-density-input').value) || 0;
  var totalMicron = parseFloat(document.querySelector('.total-micron-input').value) || 0;

  // Declare a variable to hold the result of the calculation
  var length = 0;

  // Check if productType is "roll"
  if (productType === "roll") {
    var rollRealWidth = parseFloat(document.querySelector('.roll-real-width').value) || 0;
    length = (filmOnRollWeight * 1000 / filmDensity) / ((totalMicron / 10000) * (rollRealWidth / 10)) / 100;

  // Check if productType is "sleeve"
  } else if (productType === "sleeve") {
    var realWidthValue = parseFloat(document.querySelector('.real-width-value').value) || 0;
    length = (filmOnRollWeight * 1000 / filmDensity) / ((totalMicron / 10000) * (realWidthValue / 10)) / 100;

  // Check if productType is "bag-pouch"
  } else if (productType === "bag-pouch") {
    var openHeight = parseFloat(document.querySelector('.open-height').value) || 0;
    length = (filmOnRollWeight * 1000 / filmDensity) / ((totalMicron / 10000) * (openHeight / 10)) / 100;
  }

  // Check if the calculated length is NaN
  if (isNaN(length)) {
    length = 0; // Set length to 0 if the result is NaN
  }

  // Update the value of the input with class 'film-on-roll-length'
  document.querySelector('.film-on-roll-length').value = Math.round(length).toLocaleString(); // Round to nearest integer and format
}

// Add event listeners to update the calculation whenever values change
document.querySelector('.film-on-roll-weight').addEventListener('input', calculateFilmOnRollLength);
document.querySelector('.film-density-input').addEventListener('input', calculateFilmOnRollLength);
document.querySelector('.total-micron-input').addEventListener('input', calculateFilmOnRollLength);
document.querySelector('.roll-real-width').addEventListener('input', calculateFilmOnRollLength);
document.querySelector('.real-width-value').addEventListener('input', calculateFilmOnRollLength);
document.querySelector('.open-height').addEventListener('input', calculateFilmOnRollLength);
document.getElementById('productType').addEventListener('change', calculateFilmOnRollLength);

// Initial calculation on page load
calculateFilmOnRollLength();



function updateRollWidth() {
  // Get the productType value
  var productType = document.getElementById('productType').value;

  // Declare a variable to hold the roll-width value
  var rollWidthValue = 0;

  // Set the value based on productType
  if (productType === "roll") {
    rollWidthValue = parseFloat(document.querySelector('.roll-real-width').value) || 0;
  } else if (productType === "sleeve") {
    rollWidthValue = parseFloat(document.querySelector('.real-width-value').value) || 0;
  } else if (productType === "bag-pouch") {
    rollWidthValue = parseFloat(document.querySelector('.open-height').value) || 0;
  }

  // Update the value of the roll-width input field
  rollWidthValue = isNaN(rollWidthValue) ? 0.00 : rollWidthValue;
  document.querySelector('.roll-width').value = rollWidthValue.toFixed(2); // You can adjust the decimal places if needed
}

// Add event listeners to update the roll-width value whenever the relevant values change
document.querySelector('.roll-real-width').addEventListener('input', updateRollWidth);
document.querySelector('.real-width-value').addEventListener('input', updateRollWidth);
document.querySelector('.open-height').addEventListener('input', updateRollWidth);
document.getElementById('productType').addEventListener('change', updateRollWidth);

// Initial update on page load
updateRollWidth();



function updatePiecesPerRoll() {
  // Get the productType value

  // Declare a variable to hold the roll-width value
  var rollWidthValue = 0;

    filmOnRoll = parseFloat(document.querySelector('.film-on-roll-weight').value) || 0;
    piecesPerKg = parseFloat(document.querySelector('.pieces-per-kg-field').value) || 0;

    rollWidthValue = filmOnRoll * piecesPerKg;
    
  

  // Update the value of the roll-width input field
  rollWidthValue = isNaN(rollWidthValue) ? 0 : rollWidthValue;
  document.querySelector('.pieces-per-roll').value = Math.round(rollWidthValue).toLocaleString(); // You can adjust the decimal places if needed
}

// Add event listeners to update the roll-width value whenever the relevant values change
document.querySelector('.film-on-roll-weight').addEventListener('input', updatePiecesPerRoll);
document.querySelector('.pieces-per-kg-field').addEventListener('input', updatePiecesPerRoll);

// Initial update on page load
updatePiecesPerRoll();






function calculateCoreInsideRoll() {
  // Get the productType value
  var productType = document.getElementById('productType').value;

  // Common inputs
  var requiredRollWeightKg = parseFloat(document.querySelector('.required-roll-weight-kg').value) || 0;
  var filmDensity = parseFloat(document.querySelector('.film-density-input').value) || 0;
  var coreInside = parseFloat(document.querySelector('.core-inside').value) || 0;

  // Declare the calculated value
  var calculatedValue = 0;

  // Perform calculation based on product type
  if (productType === 'roll') {
    var rollRealWidth = parseFloat(document.querySelector('.roll-real-width').value) || 0;
    calculatedValue = 2 * Math.sqrt(
      (((requiredRollWeightKg * 1000) / filmDensity) / (rollRealWidth / 10) / Math.PI) +
      ((coreInside / 2 / 10) ** 2)
    ) * 10;
  } else if (productType === 'sleeve') {
    var realWidthValue = parseFloat(document.querySelector('.real-width-value').value) || 0;
    calculatedValue = 2 * Math.sqrt(
      (((requiredRollWeightKg * 1000) / filmDensity) / (realWidthValue / 10) / Math.PI) +
      ((coreInside / 2 / 10) ** 2)
    ) * 10;
  } else if (productType === 'bag-pouch') {
    var openHeight = parseFloat(document.querySelector('.open-height').value) || 0;
    calculatedValue = 2 * Math.sqrt(
      (((requiredRollWeightKg * 1000) / filmDensity) / (openHeight / 10) / Math.PI) +
      ((coreInside / 2 / 10) ** 2)
    ) * 10;
  }

  calculatedValue = isNaN(calculatedValue) ? 0 : calculatedValue;

  // Update the value of the core-inside-roll input field
  document.querySelector('.core-inside-roll').value = Math.round(calculatedValue).toLocaleString(); // Rounded value with formatting
}

// Add event listeners to update the calculation whenever related values change
document.querySelector('.required-roll-weight-kg').addEventListener('input', calculateCoreInsideRoll);
document.querySelector('.film-density-input').addEventListener('input', calculateCoreInsideRoll);
document.querySelector('.core-inside').addEventListener('input', calculateCoreInsideRoll);
document.querySelector('.roll-real-width').addEventListener('input', calculateCoreInsideRoll);
document.querySelector('.real-width-value').addEventListener('input', calculateCoreInsideRoll);
document.querySelector('.open-height').addEventListener('input', calculateCoreInsideRoll);
document.getElementById('productType').addEventListener('change', calculateCoreInsideRoll);

// Initial calculation on page load
calculateCoreInsideRoll();





function calculateCostOneMeterZipper() {
  // Get the productType value
  var rollWidthValue = 0;

  // Parse values for filmOnRoll and piecesPerKg
  const filmOnRoll = parseFloat(document.querySelector('.cost-one-meter-zipper').value) || 0;
  const piecesPerKg = parseFloat(document.querySelector('.weight-of-one-meter-zip').value) || 0;

  // Calculate rollWidthValue
  if (piecesPerKg !== 0) {
    rollWidthValue = filmOnRoll / piecesPerKg;
  }

  // Ensure the rollWidthValue is set to 0.000 if it's zero or invalid
  rollWidthValue = rollWidthValue > 0 ? rollWidthValue : 0;

  // Update the value of the roll-width input field
  document.querySelector('.cost-one-gr-zipper').value = rollWidthValue.toFixed(3); // Adjust the decimal places if needed

  // Call the additional calculation
  calculateZipperCostPerPouch();
}

// Add event listeners to update the roll-width value whenever the relevant values change
document.querySelector('.cost-one-meter-zipper').addEventListener('input', calculateCostOneMeterZipper);
document.querySelector('.weight-of-one-meter-zip').addEventListener('input', calculateCostOneMeterZipper);

// Initial update on page load
calculateCostOneMeterZipper();



function calculateZipperWeightPerPouch() {
  // Get the productType value

  // Declare a variable to hold the roll-width value
  var rollWidthValue = 0;

    filmOnRoll = parseFloat(document.querySelector('.open-width').value) || 0;
    piecesPerKg = parseFloat(document.querySelector('.weight-of-one-meter-zip').value) || 0;

    rollWidthValue = filmOnRoll * piecesPerKg * 0.001;
    
  

  // Update the value of the roll-width input field
  document.querySelector('.zipper-weight-per-pouch').value = rollWidthValue.toFixed(2); // You can adjust the decimal places if needed
  calculateZipperCostPerPouch();
  calculateQuantityZipperOne();
  calculateQuantityZipperTwo();
}

// Add event listeners to update the roll-width value whenever the relevant values change
document.querySelector('.open-width').addEventListener('input', calculateZipperWeightPerPouch);
document.querySelector('.weight-of-one-meter-zip').addEventListener('input', calculateZipperWeightPerPouch);

// Initial update on page load
calculateZipperWeightPerPouch();




function calculateZipperCostPerPouch() {
  // Get the productType value

  // Declare a variable to hold the roll-width value
  var rollWidthValue = 0;

    filmOnRoll = parseFloat(document.querySelector('.zipper-weight-per-pouch').value) || 0;
    piecesPerKg = parseFloat(document.querySelector('.cost-one-gr-zipper').value) || 0;

    rollWidthValue = filmOnRoll * piecesPerKg;
    
  

  // Update the value of the roll-width input field
  document.querySelector('.zipper-cost-per-pouch').value = rollWidthValue.toFixed(3); // You can adjust the decimal places if needed
}

// Add event listeners to update the roll-width value whenever the relevant values change
document.querySelector('.zipper-weight-per-pouch').addEventListener('input', calculateZipperCostPerPouch);
document.querySelector('.cost-one-gr-zipper').addEventListener('input', calculateZipperCostPerPouch);

// Initial update on page load
calculateZipperCostPerPouch();


function calculateZipperCostOneKg() {
  // Get the productType value

  // Declare a variable to hold the roll-width value
  var rollWidthValue = 0;

    filmOnRoll = parseFloat(document.querySelector('.zipper-cost-per-pouch').value) || 0;
    piecesPerKg = parseFloat(document.querySelector('.pieces-per-kg-field').value) || 0;

    rollWidthValue = filmOnRoll * piecesPerKg;
    
  

  // Update the value of the roll-width input field
  document.querySelector('.zipper-cost-one-kg').value = rollWidthValue.toFixed(3); // You can adjust the decimal places if needed
}

// Add event listeners to update the roll-width value whenever the relevant values change
document.querySelector('.zipper-cost-per-pouch').addEventListener('input', calculateZipperCostOneKg);
document.querySelector('.pieces-per-kg-field').addEventListener('input', calculateZipperCostOneKg);

// Initial update on page load
calculateZipperCostOneKg();


function calculateQuantityZipperOne() {
  // Get the productType value

  // Declare a variable to hold the roll-width value
  var rollWidthValue = 0;

    filmOnRoll = parseFloat(document.querySelector('.zipper-weight-per-pouch').value) || 0;
    piecesPerKg = parseFloat(document.querySelector('.weight-of-one-meter-zip').value) || 0;
    orderQuanityKPieces = parseFloat(document.querySelector('.orderQuanInKpieces').value) || 0;


    rollWidthValue = (filmOnRoll * orderQuanityKPieces * 1000) / piecesPerKg;
    rollWidthValue = (!isFinite(rollWidthValue) || isNaN(rollWidthValue)) ? 0 : rollWidthValue;
    
  

  // Update the value of the roll-width input field
  document.querySelector('.quantity-req-zipper-one').value = rollWidthValue.toLocaleString(); // You can adjust the decimal places if needed
}

// Add event listeners to update the roll-width value whenever the relevant values change
document.querySelector('.zipper-weight-per-pouch').addEventListener('input', calculateQuantityZipperOne);
document.querySelector('.weight-of-one-meter-zip').addEventListener('input', calculateQuantityZipperOne);
document.querySelector('.orderQuanInKpieces').addEventListener('input', calculateQuantityZipperOne);



// Initial update on page load
calculateQuantityZipperOne();





function calculateQuantityZipperTwo() {
  // Get the productType value

  // Declare a variable to hold the roll-width value
  var rollWidthValue = 0;

    filmOnRoll = parseFloat(document.querySelector('.zipper-weight-per-pouch').value) || 0;
    orderQuanityKPieces = parseFloat(document.querySelector('.orderQuanInKpieces').value) || 0;


    rollWidthValue = filmOnRoll * orderQuanityKPieces.toLocaleString() ;
    
  

  // Update the value of the roll-width input field
  document.querySelector('.quantity-req-zipper-two').value = rollWidthValue.toLocaleString(); // You can adjust the decimal places if needed
}

// Add event listeners to update the roll-width value whenever the relevant values change
document.querySelector('.zipper-weight-per-pouch').addEventListener('input', calculateQuantityZipperTwo);
document.querySelector('.orderQuanInKpieces').addEventListener('input', calculateQuantityZipperTwo);



// Initial update on page load
calculateQuantityZipperTwo();



function updateSpeedFieldPouch(event) {
    const inputField = event.target; // Get the input field that triggered the event

    // Get the value entered by the user
    let value = inputField.value.trim();

    // Remove any existing unit from the value (if the user has already typed some value)
    value = value.replace(" Pcs/Min", "").trim();

    // Allow only numbers, so filter out any non-numeric characters
    value = value.replace(/[^0-9]/g, ""); // Remove non-numeric characters

    // If the value is not empty and is a valid number, update the field
    if (value && !isNaN(value)) {
        inputField.value = value + " Pcs/Min"; // Append the unit
    } else if (value === "") {
        // If no input, reset the field to a default value (optional)
        inputField.value = "000 Pcs/Min"; // Reset to default (optional)
    }
}

document.querySelectorAll(".pouch-speed-feild").forEach(inputField => {
    inputField.addEventListener("input", updateSpeedFieldPouch);
});


function calculatePouchSetupHour() {
    // Get input values
    const orderQuant = parseFloat(document.querySelector(".orderQuanInKpieces")?.value.replace(/,/g, '')) || 0;
    const tenSpeed = parseFloat(document.querySelector(".ten-speed")?.value.replace(/,/g, '')) || 0;
    const tenSetup = parseFloat(document.querySelector(".ten-setup")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    let perLmValue = tenSetup + (((orderQuant * 1000) / tenSpeed) / 60);
    
        
    // Set the calculated value
    const perSqmInput = document.querySelector(".ten-hour");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0.00 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
    }

    calculateProcessCostTen();
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".orderQuanInKpieces") || 
        event.target.matches(".ten-speed") ||
        event.target.matches(".ten-setup")  
    ) {
        calculatePouchSetupHour();
    }
});



function calculateProcessCostTen() {
    // Get input values
    const orderQuant = parseFloat(document.querySelector(".ten-process-cost")?.value.replace(/,/g, '')) || 0;
    const tenSpeed = parseFloat(document.querySelector(".ten-hour")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    let perLmValue = tenSpeed * orderQuant ;
    
        
    // Set the calculated value
    const perSqmInput = document.querySelector(".process-cost-ten");
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0 : perLmValue;
        perSqmInput.value = perLmValue.toLocaleString(); // Format to 2 decimal places
    }

    calculateTotalCost();
}

// Trigger calculation when fields are updated
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".ten-process-cost") || 
        event.target.matches(".ten-hour") ||
        event.target.matches(".ten-setup")
    ) {
        calculateProcessCostTen();
    }
});



function calculateOutOperationCost() {
    // Get input values
    const orderQuant = parseFloat(document.querySelector(".total-process-cost")?.value.replace(/,/g, '')) || 0;
    const tenSpeed = parseFloat(document.querySelector(".orderQuantityInKgs")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    let perLmValue = orderQuant / tenSpeed ;
    
        
    // Set the calculated value
    const perSqmInput = document.querySelector(".opearion-cost-per-kg");
    const fifthperkg = document.querySelector(".fifth-per-kg");

    
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places
        fifthperkg.value = perLmValue.toFixed(2);

    }

    calculateEstimationTotalCost();
    calculateFifthKpcs();
    calculateFifthSqm();
    calculateFifthLm();
    calculateFifthPerRoll();
    calculateSecondDifference();
    calculateLastKg();
}


function calculateFirstPerRoll() {
    // Get input values
    const orderQuant = parseFloat(document.querySelector(".perLmValue")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    let perLmValue = orderQuant * 500 ;
    
        
    // Set the calculated value
    const perSqmInput = document.querySelector(".firstPerRoll");

    
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places

    }

    calculateSixPerRoll();
}

function calculateSecondPerRoll() {
    // Get input values
    const orderQuant = parseFloat(document.querySelector(".secondPerLM")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    let perLmValue = orderQuant * 500 ;
    
        
    // Set the calculated value
    const perSqmInput = document.querySelector(".secondPerRoll");

    
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places

    }

    calculateSixPerRoll();
}


function calculateThirdPerRoll() {
    // Get input values
    const orderQuant = parseFloat(document.querySelector(".thirdPerLM")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    let perLmValue = orderQuant * 500 ;
    
        
    // Set the calculated value
    const perSqmInput = document.querySelector(".thirdPerRoll");

    
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places

    }

    calculateSixPerRoll();
}


function calculateFourthPerRoll() {
    // Get input values
    const orderQuant = parseFloat(document.querySelector(".fourthLm")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    let perLmValue = orderQuant * 500 ;
    
        
    // Set the calculated value
    const perSqmInput = document.querySelector(".fourthPerRoll");

    
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places

    }
    calculateSixPerRoll();
}


function calculateFifthPerRoll() {
    // Get input values
    const orderQuant = parseFloat(document.querySelector(".fifth-lm")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    let perLmValue = orderQuant * 500 ;
    
        
    // Set the calculated value
    const perSqmInput = document.querySelector(".fifthPerRoll");

    
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places

    }
    calculateSixPerRoll();
}


function calculateSixPerRoll() {
    // Get input values
    const firstPerRoll = parseFloat(document.querySelector(".firstPerRoll")?.value.replace(/,/g, '')) || 0;
    const secondPerRoll = parseFloat(document.querySelector(".secondPerRoll")?.value.replace(/,/g, '')) || 0;
    const thirdPerRoll = parseFloat(document.querySelector(".thirdPerRoll")?.value.replace(/,/g, '')) || 0;
    const fourthPerRoll = parseFloat(document.querySelector(".fourthPerRoll")?.value.replace(/,/g, '')) || 0;
    const fifthPerRoll = parseFloat(document.querySelector(".fifthPerRoll")?.value.replace(/,/g, '')) || 0;

    // Calculate the value
    let perLmValue = firstPerRoll + secondPerRoll + thirdPerRoll + fourthPerRoll + fifthPerRoll;
    
        
    // Set the calculated value
    const perSqmInput = document.querySelector(".sixPerRoll");

    
    if (perSqmInput) {
        perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0 : perLmValue;
        perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places

    }
}

function appendOrUpdateRowToLowerTable(rowId) {
    const row = document.querySelector(`#${CSS.escape(rowId)}`);
    if (!row) {
        console.error(`Row with id ${rowId} not found.`);
        return;
    }

    const materialSelect = row.querySelector(".field-material select");
    const costPerKgInput = row.querySelector(".field-cost-per-kg input");

    if (materialSelect && costPerKgInput) {
        const materialValue = materialSelect.value;
        const costPerKgValue = costPerKgInput.value.trim();
        const lowerTableBody = document.querySelector(".actual-table .table tbody");

        let lowerRow = document.querySelector(`#lower-row-${rowId}`);

        if (lowerRow) {
            lowerRow.querySelector(".actual-material").value = materialValue;
            lowerRow.querySelector(".actual-cost-per-kg").value = costPerKgValue;
        } else {
            lowerRow = document.createElement("tr");
            lowerRow.id = `lower-row-${rowId}`;
            lowerRow.innerHTML = `
                <td><input type="hidden" value="${rowId}" name="row_id[]">
                    <input type="text" value="${materialValue}" name="actual-material[]" class="actual-material" readonly>
                </td>
                <td><input type="text" value="0" name="actual-consumption[]" class="actual-consumption blue-field"></td>
                <td><input type="number" value="${costPerKgValue}" name="actual-cost-per-kg[]" class="actual-cost-per-kg" readonly></td>
                <td><input type="text" value="0" name="actual-total-amount[]" class="actual-total-amount" readonly></td>
                <input class="hidden-field-value" name="hidden-field-value[]" value="0" hidden>
            `;

            const solventMixRow = lowerTableBody.querySelector("tr:last-child");
            
            // Get all existing rows except the solvent row
            const existingRows = Array.from(lowerTableBody.querySelectorAll("tr"))
                .filter(tr => tr !== solventMixRow)
                .sort((a, b) => parseInt(a.id.replace("lower-row-", "")) - parseInt(b.id.replace("lower-row-", "")));
            
            // Clear and reinsert rows in sorted order
            lowerTableBody.innerHTML = "";
            existingRows.forEach(tr => lowerTableBody.appendChild(tr));
            lowerTableBody.appendChild(lowerRow);
            lowerTableBody.appendChild(solventMixRow);
        }
    } else {
        console.error("Material select or cost per kg input not found.");
    }
}

    // Listen for changes in materialSelect dropdown
    document.querySelectorAll(".field-material select").forEach(function(materialSelect) {
        materialSelect.addEventListener("change", function() {
            const rowId = this.closest("tr").id;
            appendOrUpdateRowToLowerTable(rowId);
        });
    });


    // Listen for updates in cost-per-kg-input field
    document.addEventListener("input", function (event) {
        if (event.target.matches(".field-cost-per-kg input")) {
            const rowId = event.target.closest("tr").id;
            updateLowerTableRow(rowId);
        }
    });

    // Function to update corresponding lower table row based on upper table input
    function updateLowerTableRow(rowId) {
        const row = document.querySelector(`#${CSS.escape(rowId)}`); // Escape the rowId to ensure it's a valid selector
        if (!row) {
            console.error(`Row with id ${rowId} not found.`);
            return;
        }

        const materialSelect = row.querySelector(".field-material select");
        const costPerKgInput = row.querySelector(".field-cost-per-kg input");

        if (materialSelect && costPerKgInput) {
            const materialValue = materialSelect.value;
            const costPerKgValue = costPerKgInput.value;

            const lowerRow = document.querySelector(`#lower-row-${rowId}`);

            if (lowerRow) {
                // Update the lower row with new values
                lowerRow.querySelector(".actual-material").value = materialValue;
                lowerRow.querySelector(".actual-cost-per-kg").value = costPerKgValue;
            }
        }
    }

    // Trigger initial population for already selected materials
    document.querySelectorAll(".data-row").forEach(function(row) {
        const materialSelect = row.querySelector(".field-material select");
        if (materialSelect && materialSelect.value) {
            const rowId = row.id; // Directly use the rowId
            appendOrUpdateRowToLowerTable(rowId); // Append or update a row in the lower table for each material
        }
    });


    // Function to calculate the total amount for a row
    function calculateTotalForRow(row) {
    
        const actualConsumption = parseFloat(row.querySelector(".actual-consumption")?.value.replace(/,/g, '')) || 0; // Get actual consumption value
        const actualCostPerKg = row.querySelector(".actual-cost-per-kg").value || 0;   // Get cost per kg value

        // Calculate the total
        const totalAmount = parseFloat(actualConsumption) * parseFloat(actualCostPerKg);

        // Update the actual-total-amount field
        const totalAmountField = row.querySelector(".actual-total-amount");
        totalAmountField.value = Math.round(totalAmount).toLocaleString(); // Set value with 2 decimal places


        const lastTotalAmountField = document.querySelector(".last-total-amount-one");
        const lastTotalAmount = lastTotalAmountField ? parseFloat(lastTotalAmountField.value.replace(/,/g, '')) || 0 : 0;

        // Update the hidden-field-value field
        const hiddenField = row.querySelector(".hidden-field-value");
        if (hiddenField) {
            if (lastTotalAmount > 0) {
                const calculatedValue = (totalAmount / lastTotalAmount) * 100; // Calculate percentage
                hiddenField.value = calculatedValue.toFixed(1); // Set value with 2 decimal places
            } else {
                hiddenField.value = "0.0"; // Handle division by zero case
            }
        }

        calculateTotalAmountActualEstimation();
        updateChart();
    }

    // Event listener for changes in actual-consumption fields
    document.addEventListener("input", function (event) {
        if (event.target.classList.contains("actual-consumption")) {
            const row = event.target.closest("tr"); // Get the current row
            calculateTotalForRow(row); // Recalculate the total for the row
        }
    });

    function updateSolventCost() {
    const lastCostPerKg = document.querySelector(".cost-per-kg-last-value").value || 0; // Get the value of 'cost-per-kg-last-value'
    const solventField = document.querySelector(".actual-cost-per-kg-solvent"); // Get the 'actual-cost-per-kg-solvent' field

    if (solventField) {
        solventField.value = parseFloat(lastCostPerKg).toFixed(2); // Set the value with 2 decimal places
    }
    }

    // Event listener for changes in 'cost-per-kg-last-value'
    document.querySelector(".cost-per-kg-last-value").addEventListener("input", updateSolventCost);
    document.querySelector(".cost-per-kg-last-value").addEventListener("change", updateSolventCost);

    // Initial setup to ensure the value is synced on page load
    updateSolventCost();

    function formatToLocaleString(value) {
        if (!value) return ""; // Return empty if no value
        // Remove non-numeric characters
        const numericValue = value.replace(/[^0-9]/g, "");
        // Format the number with commas
        return parseInt(numericValue, 10).toLocaleString();
    }

    // Add event listener to all fields with the specified classes
    document.addEventListener("input", function (e) {
        if (
            e.target.classList.contains("actual-consumption") || 
            e.target.classList.contains("actual-consumption-solvent")||
            e.target.classList.contains("final-output") 
            
        ) {
            const inputField = e.target;
            const formattedValue = formatToLocaleString(inputField.value);
            inputField.value = formattedValue;
        }
    });


    function calculateTolalAmountSolvent() {

        const actualConsumption = parseFloat(document.querySelector(".actual-consumption-solvent")?.value.replace(/,/g, '')) || 0; // Get actual consumption value
        const actualCostPerKg = document.querySelector(".actual-cost-per-kg-solvent").value || 0;   // Get cost per kg value

        // Calculate the total
        const totalAmount = parseFloat(actualConsumption) * parseFloat(actualCostPerKg);

        // Update the actual-total-amount field
        const totalAmountField = document.querySelector(".actual-total-amount-solvent");
        totalAmountField.value = Math.round(totalAmount).toLocaleString(); // Set value with 2 decimal places
        calculateTotalAmountActualEstimation();
        calculateLastSolventValue();
    }


    document.addEventListener("input", function (event) {
        if (
            event.target.matches(".actual-consumption-solvent") || 
            event.target.matches(".actual-cost-per-kg-solvent")|| 
            event.target.matches(".cost-per-kg-last-value")
        ) {
            calculateTolalAmountSolvent();
        }
    });

    calculateTolalAmountSolvent();


    function calculateTotalAmountActualEstimation() {
    let totalAmount = 0;

        // Select all 'actual-total-amount' fields and add their values
        document.querySelectorAll(".actual-total-amount").forEach(function (field) {
            const value = parseFloat(field.value.replace(/,/g, "")) || 0;
            totalAmount += value;
        });

        // Select the 'actual-total-amount-solvent' field and add its value
        const solventField = document.querySelector(".actual-total-amount-solvent");
        if (solventField) {
            const solventValue = parseFloat(solventField.value.replace(/,/g, "")) || 0;
            totalAmount += solventValue;
        }

        // Assign the total to the 'last-total-amount-one' field
        const totalField = document.querySelector("input[name='last-total-amount-one']");
        if (totalField) {
            totalField.value = Math.round(totalAmount).toLocaleString(); // Ensure the value is formatted to two decimal places
        }

        calculateRawMaterialCostOne();   
        calculateLastSolventValue(); 


         // Trigger row recalculations
        updateHiddenFieldValues();
    }

    calculateTotalAmountActualEstimation();



    function updateAllRows() {
        const rows = document.querySelectorAll("tr"); // Adjust selector for your table's rows

        rows.forEach(function (row) {
            if (row.querySelector(".actual-consumption")) {
                calculateTotalForRow(row); // Recalculate each row
            }
        });
    }


    function updateHiddenFieldValues() {
        const lastTotalAmountField = document.querySelector("input[name='last-total-amount-one']");
        const lastTotalAmount = lastTotalAmountField ? parseFloat(lastTotalAmountField.value.replace(/,/g, "")) || 0 : 0;

        // Select all rows
        const rows = document.querySelectorAll("tr");

        rows.forEach(function (row) {
            const totalAmountField = row.querySelector(".actual-total-amount");
            const hiddenField = row.querySelector(".hidden-field-value");

            if (totalAmountField && hiddenField) {
                const totalAmount = parseFloat(totalAmountField.value.replace(/,/g, "")) || 0;

                if (lastTotalAmount > 0) {
                    // Calculate and update the hidden field value
                    const calculatedValue = (totalAmount / lastTotalAmount) * 100;
                    hiddenField.value = Math.round(calculatedValue).toFixed(1); // Format to 1 decimal place
                } else {
                    hiddenField.value = "0.0"; // Handle division by zero
                }
            }
        });
    }



    function calculateRawMaterialCostOne() {
        // Get input values
        const firstPerRoll = parseFloat(document.querySelector(".last-total-amount-one")?.value.replace(/,/g, '')) || 0;
        const secondPerRoll = parseFloat(document.querySelector(".final-output")?.value.replace(/,/g, '')) || 0;

        // Calculate the value
        let perLmValue = firstPerRoll / secondPerRoll ;
        
            
        // Set the calculated value
        const perSqmInput = document.querySelector(".actual-raw-material-cost-one");

    
        if (perSqmInput) {
            perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0 : perLmValue;
            perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places

        }


        calculateFirstDifference();
        calculateactualtotalcost();
        
    }

    document.addEventListener("input", function (event) {
        if (
            event.target.matches(".final-output")
        ) {
            calculateRawMaterialCostOne();
        }
    });


    function calculateFirstDifference() {
        // Get input values
        const firstPerRoll = parseFloat(document.querySelector(".actual-raw-material-cost-one")?.value.replace(/,/g, '')) || 0;
        const secondPerRoll = parseFloat(document.querySelector(".per-kg-field")?.value.replace(/,/g, '')) || 0;

        // Calculate the value
        let perLmValue = ((firstPerRoll - secondPerRoll) / secondPerRoll) * 100  ;
        
            
        // Set the calculated value
        const perSqmInput = document.querySelector(".last-difference-one");

    
        if (perSqmInput) {  
            perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0 : perLmValue;
            perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places

        }
        
    }

    calculateFirstDifference();



    function calculateEstimationTotalCost() {

        const firstPerKg = parseFloat(document.querySelector(".per-kg-field")?.value.replace(/,/g, '')) || 0;

        const thirdPerKg = parseFloat(document.querySelector(".third-per-kg-value")?.value.replace(/,/g, '')) || 0;

        const fourthPrKg = parseFloat(document.querySelector(".fourth-per-kg")?.value.replace(/,/g, '')) || 0;

        const fifthperKg = parseFloat(document.querySelector(".fifth-per-kg")?.value.replace(/,/g, '')) || 0;


        // Calculate the value
        let perLmValue = fourthPrKg + thirdPerKg + firstPerKg + fifthperKg;
        
            
        // Set the calculated value
        const perSqmInput = document.querySelector(".estimation-total-cost");

    
        if (perSqmInput) {
            perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0 : perLmValue;
            perSqmInput.value = perLmValue.toFixed(2); // Format to 2 decimal places

        }

        calculateActualDifference();
        calculateEstimatedMargin();
        calculatefirstPercentage();
        calculatefirstDifferenceValue();
        calculatesecondDifferenceValue();
        
    }


     document.addEventListener("input", function (event) {
        if (
            event.target.matches(".third-per-kg-value") || 
            event.target.matches(".fourth-per-kg")|| 
            event.target.matches(".fifth-per-kg")
        ) {
            calculateEstimationTotalCost();
        }
    });

    calculateEstimationTotalCost();



    function calculateLastSolventValue() {
        // Get input values
        const firstPerRoll = parseFloat(document.querySelector(".actual-total-amount-solvent")?.value.replace(/,/g, '')) || 0;
        const secondPerRoll = parseFloat(document.querySelector(".last-total-amount-one")?.value.replace(/,/g, '')) || 0;

        // Calculate the value
        let perLmValue = (firstPerRoll / secondPerRoll) * 100;
        
            
        // Set the calculated value
        const perSqmInput = document.querySelector(".solvent-mix-hidden-field");

    
        if (perSqmInput) {
            perLmValue = (!isFinite(perLmValue) || isNaN(perLmValue)) ? 0 : perLmValue;
            perSqmInput.value = perLmValue.toFixed(1); // Format to 2 decimal places

        }

        updateChart();


        
        
    }

    calculateLastSolventValue();



    function updateChart() {
        const materials = [];
        const values = [];

        // Get rows
        const rows = document.querySelectorAll("#graphTable tbody tr");

        rows.forEach((row) => {
            const materialInput = row.querySelector(".actual-material, .actual-material-solvent");
            const valueInput = row.querySelector(".hidden-field-value, .solvent-mix-hidden-field");

            if (!materialInput) {
                console.warn("Missing material input in row:", row.innerHTML);
            }
            if (!valueInput) {
                console.warn("Missing value input in row:", row.innerHTML);
            }

            if (materialInput && valueInput) {
                const material = materialInput.value || "Unknown Material"; 
                const value = Number(valueInput.value) || 0;
                materials.push(material);
                values.push(value);
            }
        });

        if (barChart) {
            // Update chart labels and data
            barChart.data.labels = materials;
            barChart.data.datasets[0].data = values;

            // Refresh the chart
            barChart.update();
        } else {
            console.error("Chart not initialized.");
        }
    }    


    function updateSecondChart() {
        const materials = [];
        const values = [];

        // Get rows from #lowerTable
        const rows = document.querySelectorAll("#lowerTable tbody tr");

        rows.forEach((row) => {
            const materialInput = row.querySelector(".process-name");
            const valueInput = row.querySelector(".hidden-value");

            if (!materialInput) {
                console.warn("Missing material input in row:", row.innerHTML);
            }
            if (!valueInput) {
                console.warn("Missing value input in row:", row.innerHTML);
            }

            if (materialInput && valueInput) {
                const material = materialInput.value || "Unknown Material"; 
                const value = Number(valueInput.value.replace(/,/g, '')) || 0; // Ensure proper number parsing
                materials.push(material);
                values.push(value);
            }
        });

        if (secondBarChart) { // Use a separate chart instance
            // Update second chart labels and data
            secondBarChart.data.labels = materials;
            secondBarChart.data.datasets[0].data = values;

            // Refresh the second chart
            secondBarChart.update();
        } else {
            console.error("Second chart not initialized.");
        }
    }  



  function updateLowerTable(event) {
    const row = event.target.closest('tr');
    const processHeading = row.querySelector('.process-heading').textContent;
    const processCost = row.querySelector('.process-cost-unique').value;
    const lowerTableBody = document.querySelector('#lowerTable tbody');

    if (event.target.checked) {
        // Append row to lower table
        const newRow = document.createElement('tr');
        newRow.dataset.process = processHeading;
        newRow.innerHTML = `
            <td class="has-input"><input type="text" value="${processHeading}" name="process-name[]" class="process-name" readonly></td>
            <td class="has-input"><input type="number" value="0.00"  name="actual-hours[]" class="blue-field actual-hours"></td>
            <td class="has-input"><input type="number" value="${processCost}"  name="process-cost-hour[]" class="process-cost-hour" readonly></td>
            <td class="has-input"><input type="text" value="0"  name="total-amount-actual[]" class="total-amount-actual" readonly></td>
            <td hidden><input type="text" value="0"  name="hidden-value[]" class="hidden-value" readonly hidden></td>
        `;
        lowerTableBody.appendChild(newRow);
    } else {
        // Remove row from lower table
        const rowToRemove = lowerTableBody.querySelector(`tr[data-process="${processHeading}"]`);
        if (rowToRemove) {
            lowerTableBody.removeChild(rowToRemove);
            updateLastTotalAmount();
        }
    }
}


    // Function to update hidden values
    function updateHiddenValues() {
        const lastTotalAmountField = document.querySelector('.last-total-amount-two');
        let lastTotalAmount = parseFloat(lastTotalAmountField.value.replace(/,/g, '')) || 1; // Remove commas and avoid division by zero

        const hiddenFields = document.querySelectorAll('.hidden-value');

        hiddenFields.forEach(function (hiddenField) {
            const row = hiddenField.closest('tr');
            const totalAmountActualField = row.querySelector('.total-amount-actual');

            let totalAmountActual = parseFloat(totalAmountActualField.value.replace(/,/g, '')) || 0; // Remove commas

            const hiddenValue = (totalAmountActual / lastTotalAmount) * 100;
            hiddenField.value = hiddenValue.toFixed(2);
        });

        updateSecondChart();


    }


    // Function to update the process cost in the lower table when input is changed
    function updateProcessCost(event) {
        const row = event.target.closest('tr');
        const processHeading = row.querySelector('.process-heading').textContent;
        const updatedCost = event.target.value;
        

        const lowerTableBody = document.querySelector('#lowerTable tbody');
        const rowInLowerTable = lowerTableBody.querySelector(`tr[data-process="${processHeading}"]`);

        if (rowInLowerTable) {
            rowInLowerTable.querySelector('.process-cost-hour').value = updatedCost;
            calculateTotalAmount(rowInLowerTable); // Update the total amount when cost is updated
        }
    }

    // Function to calculate the total amount when actual-hours is updated
    function calculateTotalAmount(row) {
        const actualHoursInput = row.querySelector('.actual-hours');
        const processCostInput = row.querySelector('.process-cost-hour');
        const totalAmountField = row.querySelector('.total-amount-actual');

        const actualHours = parseFloat(actualHoursInput.value) || 0;
        const processCost = parseFloat(processCostInput.value) || 0;
        
        const totalAmount = actualHours * processCost;
        totalAmountField.value = totalAmount.toLocaleString(); // Format to 2 decimal places
        updateLastTotalAmount(); 
    }


    // Function to update the last total amount field
    function updateLastTotalAmount() {
        const totalAmountFields = document.querySelectorAll('.total-amount-actual');
        let totalSum = 0;
        

        totalAmountFields.forEach(function(field) {
            const value = field.value.replace(/,/g, ''); // Remove commas
            totalSum += parseFloat(value) || 0; // Parse the number
        });

        // Update the last-total-amount-two field with the total sum
        const lastTotalAmountField = document.querySelector('.last-total-amount-two');
        lastTotalAmountField.value = totalSum.toLocaleString(); // Format to 2 decimal places

        calculateRawMaterialCostTwo();
        updateHiddenValues();

    }


    // Listen for changes in actual-hours and update total-amount-actual
    document.addEventListener('input', function (event) {
        if (event.target.matches('.actual-hours')) {
            const row = event.target.closest('tr');
            if (row) {
                calculateTotalAmount(row);
            }
        }

         // Listen for changes in total-amount-actual and update the sum
        if (event.target.matches('.total-amount-actual')) {
            updateLastTotalAmount();
        }
    });

    // Attach event listeners for checkboxes and process cost updates
    document.addEventListener('change', function (event) {
        if (event.target.matches('.row-checkbox')) {
            updateLowerTable(event);
        }
    });

    document.addEventListener('input', function (event) {
        if (event.target.matches('.process-cost-unique')) {
            updateProcessCost(event);
        }
    });


    function calculateRawMaterialCostTwo() {
        const lastTotalAmount = parseFloat(document.querySelector('.last-total-amount-two').value) || 0;
        const finalOutput = parseFloat(document.querySelector('.final-output').value) || 0;

        // Calculate the raw material cost (you can adjust the formula here as needed)
        let rawMaterialCost = lastTotalAmount / finalOutput;

        if (isNaN(rawMaterialCost) || !isFinite(rawMaterialCost)) {
        rawMaterialCost = 0.00;
        }

        // Update the actual-raw-material-cost-two field
        const rawMaterialCostField = document.querySelector('.actual-raw-material-cost-two');
        rawMaterialCostField.value = rawMaterialCost.toFixed(2); // Format to 2 decimal places

        calculateSecondDifference();
        calculateactualtotalcost();
    }


    // Event listener for changes in last-total-amount-two and final-output fields
    document.addEventListener('input', function (event) {
        // Check if the event target is the last-total-amount-two or final-output field
        if (event.target.matches('.last-total-amount-two') || event.target.matches('.final-output')) {
            calculateRawMaterialCostTwo(); // Recalculate raw material cost whenever these fields change
        }
    });




    function calculateSecondDifference() {
        const lastTotalAmount = parseFloat(document.querySelector('.opearion-cost-per-kg').value) || 0;  // Default to 0 if invalid
        const finalOutput = parseFloat(document.querySelector('.actual-raw-material-cost-two').value) || 0;  // Default to 0 if invalid

        // If finalOutput is 0, avoid division by 0 by setting rawMaterialCost to 0
        let rawMaterialCost = (finalOutput !== 0) ? (((finalOutput - lastTotalAmount) / lastTotalAmount) * 100) : 0;

        if (isNaN(rawMaterialCost) || !isFinite(rawMaterialCost)) {
        rawMaterialCost = 0.00;
        }
        
        // Update the last-difference-two field
        const rawMaterialCostField = document.querySelector('.last-difference-two');
        rawMaterialCostField.value = rawMaterialCost.toFixed(2);  // Set default to 0.00 when invalid
    }

    // Event listener for changes in last-total-amount-two and final-output fields
    document.addEventListener('input', function (event) {
        // Check if the event target is the last-total-amount-two or final-output field
        if (event.target.matches('.opearion-cost-per-kg') || event.target.matches('.actual-raw-material-cost-two')) {
            calculateRawMaterialCostTwo(); // Recalculate raw material cost whenever these fields change
        }
    });


    function calculateactualtotalcost() {
        const lastTotalAmount = parseFloat(document.querySelector('.actual-raw-material-cost-one').value) || 0;  // Default to 0 if invalid
        const finalOutput = parseFloat(document.querySelector('.actual-raw-material-cost-two').value) || 0;  // Default to 0 if invalid
        const thirdPerKg = parseFloat(document.querySelector(".third-per-kg-value")?.value.replace(/,/g, '')) || 0;
        const fourthPerKg = parseFloat(document.querySelector(".fourth-per-kg")?.value.replace(/,/g, '')) || 0;


        // If finalOutput is 0, avoid division by 0 by setting rawMaterialCost to 0
        let rawMaterialCost = lastTotalAmount + finalOutput + thirdPerKg + fourthPerKg;

        // Update the last-difference-two field
        const rawMaterialCostField = document.querySelector('.actual-total-cost');
        rawMaterialCostField.value = rawMaterialCost.toFixed(2);  // Set default to 0.00 when invalid
        calculateActualDifference();
        calculateActualMargin();
        calculatesecondPercentage();
        calculatefirstDifferenceValue();
        calculatesecondDifferenceValue();
    }


    document.addEventListener("input", function (event) {
        if (
            event.target.matches(".third-per-kg-value") || 
            event.target.matches(".fourth-per-kg")
        ) {
            calculateactualtotalcost();
        }
    });



    function calculateActualDifference() {
        const lastTotalAmount = parseFloat(document.querySelector('.estimation-total-cost').value) || 0;  // Default to 0 if invalid
        const finalOutput = parseFloat(document.querySelector('.actual-total-cost').value) || 0;  // Default to 0 if invalid

        // If finalOutput is 0, avoid division by 0 by setting rawMaterialCost to 0
        let rawMaterialCost = (finalOutput !== 0) ? (((finalOutput - lastTotalAmount) / lastTotalAmount) * 100) : 0;

        if (isNaN(rawMaterialCost) || !isFinite(rawMaterialCost)) {
        rawMaterialCost = 0.00;
        }
        
        // Update the last-difference-two field
        const rawMaterialCostField = document.querySelector('.actual-difference');
        rawMaterialCostField.value = rawMaterialCost.toFixed(1);  // Set default to 0.00 when invalid
    }


    function calculateEstimatedMargin() {
        const lastSalesPrice = parseFloat(document.querySelector('.lastSalesPrice').value) || 0;
        const estimatedTotalCost = parseFloat(document.querySelector('.estimation-total-cost').value) || 0;

        // Calculate the raw material cost (you can adjust the formula here as needed)
        let rawMaterialCost = lastSalesPrice - estimatedTotalCost;

        if (isNaN(rawMaterialCost) || !isFinite(rawMaterialCost)) {
        rawMaterialCost = 0.00;
        }

        // Update the actual-raw-material-cost-two field
        const estimatedMarginField = document.querySelector('.estimatedMargin');
        estimatedMarginField.value = rawMaterialCost.toFixed(2); // Format to 2 decimal places
        calculatethirdPercentage();

    }

    calculateEstimatedMargin();


    // Event listener for changes in last-total-amount-two and final-output fields
    document.addEventListener('input', function (event) {
        // Check if the event target is the last-total-amount-two or final-output field
        if (event.target.matches('.lastSalesPrice')) {
            calculateEstimatedMargin(); // Recalculate raw material cost whenever these fields change
        }
    });


    function calculateActualMargin() {
        const lastSalesPrice = parseFloat(document.querySelector('.lastSalesPrice').value) || 0;
        const actualTotalCost = parseFloat(document.querySelector('.actual-total-cost').value) || 0;

        // Calculate the raw material cost (you can adjust the formula here as needed)
        let rawMaterialCost = lastSalesPrice - actualTotalCost;

        if (isNaN(rawMaterialCost) || !isFinite(rawMaterialCost)) {
        rawMaterialCost = 0.00;
        }

        // Update the actual-raw-material-cost-two field
        const estimatedMarginField = document.querySelector('.actualMargin');
        estimatedMarginField.value = rawMaterialCost.toFixed(2); // Format to 2 decimal places
        calculatefourthPercentage();

    }

    calculateActualMargin();


    // Event listener for changes in last-total-amount-two and final-output fields
    document.addEventListener('input', function (event) {
        // Check if the event target is the last-total-amount-two or final-output field
        if (event.target.matches('.lastSalesPrice')) {
            calculateActualMargin(); // Recalculate raw material cost whenever these fields change
        }
    });


    function calculatefirstPercentage() {
        const lastSalesPrice = parseFloat(document.querySelector('.lastSalesPrice').value) || 0;
        const estimationTotalCost = parseFloat(document.querySelector('.estimation-total-cost').value) || 0;

        // Calculate the raw material cost (you can adjust the formula here as needed)
        let rawMaterialCost = (estimationTotalCost /  lastSalesPrice) * 100;

        if (isNaN(rawMaterialCost) || !isFinite(rawMaterialCost)) {
        rawMaterialCost = 0.0;
        }

        // Update the actual-raw-material-cost-two field
        const estimatedMarginField = document.querySelector('.firstPercentage');
        estimatedMarginField.value = rawMaterialCost.toFixed(1) + '%'; // Format to 2 decimal places

    }

    calculatefirstPercentage();

    // Event listener for changes in last-total-amount-two and final-output fields
    document.addEventListener('input', function (event) {
        // Check if the event target is the last-total-amount-two or final-output field
        if (event.target.matches('.lastSalesPrice')) {
            calculatefirstPercentage(); // Recalculate raw material cost whenever these fields change
        }
    });



    function calculatesecondPercentage() {
        const lastSalesPrice = parseFloat(document.querySelector('.lastSalesPrice').value) || 0;
        const actualTotalCost = parseFloat(document.querySelector('.actual-total-cost').value) || 0;

        let rawMaterialCost = (actualTotalCost /  lastSalesPrice) * 100;

        if (isNaN(rawMaterialCost) || !isFinite(rawMaterialCost)) {
        rawMaterialCost = 0.0;
        }

        const estimatedMarginField = document.querySelector('.secondPercentage');
        estimatedMarginField.value = rawMaterialCost.toFixed(1) + '%'; 

    }

    calculatesecondPercentage();

    document.addEventListener('input', function (event) {
        if (event.target.matches('.lastSalesPrice')) {
            calculatesecondPercentage(); 
        }
    });



    function calculatethirdPercentage() {
        const lastSalesPrice = parseFloat(document.querySelector('.lastSalesPrice').value) || 0;
        const estimatedMargin = parseFloat(document.querySelector('.estimatedMargin').value) || 0;

        let rawMaterialCost = (estimatedMargin /  lastSalesPrice) * 100;

        if (isNaN(rawMaterialCost) || !isFinite(rawMaterialCost)) {
        rawMaterialCost = 0.0;
        }

        const estimatedMarginField = document.querySelector('.thirdPercentage');
        estimatedMarginField.value = rawMaterialCost.toFixed(1) + '%'; 

    }

    calculatethirdPercentage();

    document.addEventListener('input', function (event) {
        if (event.target.matches('.lastSalesPrice')) {
            calculatethirdPercentage(); 
        }
    });
    

    function calculatefourthPercentage() {
        const lastSalesPrice = parseFloat(document.querySelector('.lastSalesPrice').value) || 0;
        const actualMargin = parseFloat(document.querySelector('.actualMargin').value) || 0;

        let rawMaterialCost = (actualMargin /  lastSalesPrice) * 100;

        if (isNaN(rawMaterialCost) || !isFinite(rawMaterialCost)) {
        rawMaterialCost = 0.0;
        }

        const estimatedMarginField = document.querySelector('.fourthPercentage');
        estimatedMarginField.value = rawMaterialCost.toFixed(1) + '%'; 

    }

    calculatefourthPercentage();

    document.addEventListener('input', function (event) {
        if (event.target.matches('.lastSalesPrice')) {
            calculatefourthPercentage(); 
        }
    });

    function calculatefirstDifferenceValue() {
        const actualTotalCost = parseFloat(document.querySelector('.actual-total-cost').value) || 0;
        const estimationTotalCost = parseFloat(document.querySelector('.estimation-total-cost').value) || 0;

        let rawMaterialCost = actualTotalCost -  estimationTotalCost;

        if (isNaN(rawMaterialCost) || !isFinite(rawMaterialCost)) {
        rawMaterialCost = 0.0;
        }

        const estimatedMarginField = document.querySelector('.firstDifferenceValue');
        estimatedMarginField.value = rawMaterialCost.toFixed(2); 

    }

    calculatefirstDifferenceValue();

    

    function calculatesecondDifferenceValue() {
        const actualTotalCost = parseFloat(document.querySelector('.actual-total-cost').value) || 0;
        const estimationTotalCost = parseFloat(document.querySelector('.estimation-total-cost').value) || 0;

        let rawMaterialCost = ((actualTotalCost - estimationTotalCost) / estimationTotalCost) * 100;


        if (isNaN(rawMaterialCost) || !isFinite(rawMaterialCost)) {
        rawMaterialCost = 0.0;
        }

        const estimatedMarginField = document.querySelector('.secondDifferenceValue');
        estimatedMarginField.value = rawMaterialCost.toFixed(1) + '%'; 

    }

    calculatesecondDifferenceValue();

    



    


    



    
    


    


    




});








</script>



@endsection




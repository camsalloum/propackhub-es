@extends('layouts.custom')

@section('content')
<section class="hero-one">

        <div class="container-fluid">
            <div class="top-btns d-flex justify-content-center mb-3">
                
            <form id="pdfForm" action="{{ route('download.pdf', ['id' => $record->id]) }}" method="POST">
                @csrf
                <input type="hidden" name="chart" id="chartInput">
                <input type="hidden" name="secondChart" id="secondChartInput">
                <button type="button" onclick="generatePDF()" class="btn btn-pdf btn-before">Save PDF</button>
            </form>

            </div>

            <h2 class="title text-center">Flexible Packaging <br>Cost & Materials Estimation Vs Actual</h2>

            <div class="form_one customer-name"> 
                
            <div class="form-group">
            <input type="hidden" id="csrf_token" value="{{ csrf_token() }}">

                <label for="customerName" class="form-label">Customer Name</label>
                <input type="text" class="form-control" form="mainForm" value="{{$record->customerName}}" id="customerName" name="customerName" readonly>
            </div>

            <div class="form-group job-name">
                <label for="jobName" class="form-label">Job Name</label>
                <input type="text" class="form-control" form="mainForm" value="{{$record->jobName}}" id="jobName" name="jobName" readonly>
            </div>

            <div class="form-group product-type">
                <label for="productType" class="form-label">Product Type</label>
                <select class="form-select form-control" form="mainForm" id="productType" name="productType" disabled>
                    <option value="roll" {{ $record->productType == 'roll' ? 'selected' : '' }}>Roll</option>
                    <option value="sleeve" {{ $record->productType == 'sleeve' ? 'selected' : '' }}>Sleeve</option>
                    <option value="bag-pouch" {{ $record->productType == 'bag-pouch' ? 'selected' : '' }}>Bag/Pouch</option>
                </select>
            </div>

            <div class="form-group product-number">
                    <label for="projectNumber" class="form-label">Product Number</label>
                    <input type="text" class="form-control" value="{{$record->projectNumber}}" form="mainForm" id="projectNumber" name="projectNumber" readonly style="text-align: center;">
            </div>

            <div class="form-group order-quantity">
                <label for="orderQuantity" class="form-label">Order Quantity</label>
                <div class="input-group">
                    <input type="text" class="form-control orderQuantity" form="mainForm" value="{{$record->orderQuantity}}" id="orderQuantity" name="orderQuantity" disabled>
                    <select class="form-select" id="units" form="mainForm" name="units" disabled>
                        <option value="kgs" {{ $record->units == 'kgs' ? 'selected' : '' }} >Kgs</option>
                        <option value="kpcs" {{ $record->units == 'kpcs' ? 'selected' : '' }} >Kpcs</option>
                        <option value="sqm" {{ $record->units == 'sqm' ? 'selected' : '' }} >SQM</option>
                        <option value="lm"  {{ $record->units == 'lm' ? 'selected' : '' }}>LM</option>
                    </select>
                </div>
            </div>
            <div class="form-group date-pick">
                <label for="datePick" class="form-label">Date</label>
                <input type="date" value="{{ $record->project_date ? \Carbon\Carbon::createFromFormat('m/d/Y', $record->project_date)->format('Y-m-d') : '' }}"  class="form-control dateInput" form="mainForm" id="project_date" name="project_date" readonly>
            </div>
</div>
        </div>
        
        </div>
    </section>

    <section style="background: #EEF8FF;" class="py-4 mt-3">
        <div class="container-fluid">

            <!-- Roll Table -->
             @if($record->productType == "roll")
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
                            <td class="has-input"><input id="roll-real-width" form="mainForm" name="roll-real-width" type="number" 
                                value="{{ $record->secondary['roll-real-width'] !== '' ? $record->secondary['roll-real-width'] : '0.00' }}" class="roll-real-width" readonly></td>
                        </tr>
                        <tr>
                            <td>Cut Off (mm)</td>
                            <td class="has-input"><input id="roll-cut-off" form="mainForm" name="roll-cut-off" type="number" 
                                value="{{ $record->secondary['roll-cut-off'] ? $record->secondary['roll-cut-off'] : '0.00' }}" class="roll-cut-off" readonly></td>
                        </tr>
                         <tr>
                            <td>Extra Printing Trim (mm)</td>
                            <td class="has-input"><input id="roll-extra-printing-trim" form="mainForm" name="roll-extra-printing-trim" type="number" value="{{ $record->secondary['roll-extra-printing-trim'] ? $record->secondary['roll-extra-printing-trim'] : '0' }}" class="roll-extra-printing-trim" readonly></td>
                        </tr>
                        <tr>
                            <td>Pieces per Cut</td>
                            <td class="has-input"><input form="mainForm" name="roll-pieces-per-cut" id="roll-pieces-per-cut" type="number" value="{{ $record->secondary['roll-pieces-per-cut'] !== '' ? $record->secondary['roll-pieces-per-cut'] : '0' }}" class="roll-pieces-per-cut" readonly></td>
                        </tr>
                        <tr>
                            <td>Number Of Ups</td>
                            <td class="has-input"><input name="numberOfUpsRoll" form="mainForm" id="numberOfUpsRoll" type="number" 
                                value="{{ $record->secondary['numberOfUpsRoll'] !== '' ? $record->secondary['numberOfUpsRoll'] : '0' }}" class="numberOfUpsRoll" readonly></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            @endif

            @if($record->productType == "sleeve")
            <!-- Sleeve Table -->
            <div class="table-responsive result-tables sleeve-table"  id="sleeve-table">
                <table class="table table-bordered myTable">
                    <thead>
                        <tr>
                            <th colspan="2">Sleeve Dimensions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            
                            <td>Lay Flat (mm)</td>
                            <td class="has-input"><input name="lay-flat-value" form="mainForm" id="lay-flat-value" type="number"
                              class="lay-flat-value fixed-two" value="{{ $record->secondary['lay-flat-value'] !== '' ? $record->secondary['lay-flat-value'] : '0.00' }}" readonly></td>
                              
                        </tr>
                        <tr>
                            <td>Reel Width (mm)</td>
                            <td class="has-input"><input type="number" form="mainForm" id="real-width-value" name="real-width-value"  
                                value="{{ $record->secondary['real-width-value'] !== '' ? $record->secondary['real-width-value'] : '0.00' }}" class="real-width-value fixed-two" readonly></td>
                        </tr>
                        <tr>
                            <td>Cut Off (mm)</td>
                            <td class="has-input"><input name="cut-off-value" form="mainForm" id="cut-off-value" type="number" 
                                value="{{ $record->secondary['cut-off-value'] !== '' ? $record->secondary['cut-off-value'] : '0.00' }}" class="cut-off-value fixed-two" readonly></td>
                        </tr>
                        <tr>
                            <td>Extra Printing Trim (mm)</td>
                            <td class="has-input"><input type="number" form="mainForm" name="extra-printing-trim-value" id="extra-printing-trim-value" class="extra-printing-trim-value " value="{{ $record->secondary['extra-printing-trim-value'] !== '' ? $record->secondary['extra-printing-trim-value'] : '0' }}" readonly></td>
                        </tr>
                        <tr>
                            <td>Number Of Ups</td>
                            <td class="has-input"><input type="number" form="mainForm" id="number-of-ups-value" name="number-of-ups-value" class="number-of-ups-value" value="{{ $record->secondary['number-of-ups-value'] !== '' ? $record->secondary['number-of-ups-value'] : '0' }}" readonly></td>
                        </tr>
                        
                    </tbody>
                </table>
            </div>
            @endif

            @if($record->productType == "bag-pouch")
            <!-- Bag/Pouch Table -->
            <div class="pouch-zipper-table pouch-table" id="pouch-table" >
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
                                <td class="has-input"><input type="number" form="mainForm" name="open-height" id="open-height" class="open-height fixed-two" value="{{ $record->secondary['open-height'] !== '' ? $record->secondary['open-height'] : '0.00' }}" readonly></td>
                            </tr>
                            <tr>
                                <td>Open Width (with Gusset) (mm)</td>
                                <td class="has-input"><input type="number" form="mainForm" name="open-width" id="open-width" class="open-width fixed-two" value="{{ $record->secondary['open-width'] !== '' ? $record->secondary['open-width'] : '0.00' }}"  readonly ></td>
                            </tr>
                            <tr>
                                <td>Extra Printing Trim (mm)</td>
                                <td class="has-input"><input type="number" form="mainForm" name="extra-printing-trim" id="extra-printing-trim" class="extra-printing-trim" value="{{ $record->secondary['extra-printing-trim'] !== '' ? $record->secondary['extra-printing-trim'] : '0' }}" readonly></td>
                            </tr>
                            <tr>
                                <td>Number Of Ups</td>
                                <td class="has-input"><input value="{{ $record->secondary['no_of_ups'] !== '' ? $record->secondary['no_of_ups'] : '0' }}" type="number" form="mainForm" name="no_of_ups" id="no_of_ups" class="no_of_ups" readonly></td>
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
                                <td class="has-input"><input type="number" form="mainForm" name="weight-of-one-meter-zip" id="weight-of-one-meter-zip" value="{{ $record->secondary['weight-of-one-meter-zip'] !== '' ? $record->secondary['weight-of-one-meter-zip'] : '0.00' }}" class="weight-of-one-meter-zip fixed-two" readonly></td>
                            </tr>
                            <tr>
                                <td>Cost of 1 Meter Zipper</td>
                                <td class="has-input"><input type="number" form="mainForm" name="cost-one-meter-zipper" id="cost-one-meter-zipper" value="{{ $record->secondary['cost-one-meter-zipper'] !== '' ? $record->secondary['cost-one-meter-zipper'] : '0' }}" class="cost-one-meter-zipper" readonly></td>
                            </tr>
                            <tr>
                                <td>Cost of 1 gr Zipper</td>
                                <td class="has-input"><input type="number" form="mainForm" name="cost-one-gr-zipper" id="cost-one-gr-zipper" class="cost-one-gr-zipper" value="{{ $record->secondary['cost-one-gr-zipper'] !== '' ? $record->secondary['cost-one-gr-zipper'] : '0.000' }}" readonly> </td>
                            </tr>
                            <tr>
                                <td>Zipper Weight per Pouch (gr)</td>
                                <td class="has-input"><input type="number" form="mainForm" name="zipper-weight-per-pouch" id="zipper-weight-per-pouch" value="{{ $record->secondary['zipper-weight-per-pouch'] !== '' ? $record->secondary['zipper-weight-per-pouch'] : '0.00' }}" class="zipper-weight-per-pouch fixed-two" readonly></td>
                            </tr>
                            <tr>
                                <td>Zipper Cost per Pouch</td>
                                <td class="has-input"><input type="number" form="mainForm" class="zipper-cost-per-pouch" id="zipper-cost-per-pouch" value="{{ $record->secondary['zipper-cost-per-pouch'] !== '' ? $record->secondary['zipper-cost-per-pouch'] : '0.000' }}"  name="zipper-cost-per-pouch" readonly></td>
                            </tr>
                            <tr>
                                <td>Zipper Cost 1 kg</td>
                                <td class="has-input"><input type="number" form="mainForm" name="zipper-cost-one-kg" id="zipper-cost-one-kg" class="zipper-cost-one-kg" value="{{ $record->secondary['zipper-cost-one-kg'] !== '' ? $record->secondary['zipper-cost-one-kg'] : '0.000' }}" readonly></td>
                            </tr>
                            <tr>
                                <td>Quantity Required of Zippers (Mtr / Kgs)</td>
                                <td class="has-input has-two-input"><input type="text" form="mainForm" name="quantity-req-zipper-one" id="quantity-req-zipper-one" value="{{ $record->secondary['quantity-req-zipper-one'] !== '' ? $record->secondary['quantity-req-zipper-one'] : '0.00' }}" class="quantity-req-zipper-one" readonly><input name="quantity-req-zipper-two" form="mainForm" type="text" class="quantity-req-zipper-two" id="quantity-req-zipper-two" value="{{ $record->secondary['quantity-req-zipper-two'] !== '' ? $record->secondary['quantity-req-zipper-two'] : '0.00' }}" style="border-top: 1px solid #1363a680;" readonly></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            @endif

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
      </tr>
    </thead>
    <tbody>
     @if(!empty($record->arrayFields))
     @foreach($record->arrayFields as $fields)
      <tr class="data-row">
        <td class="field-type">
            <select class="form-select typeSelect" id="typeSelect" name="typeSelect[]" disabled>
                <option value="" selected disabled hidden>Select Type</option>
                <option value="1" {{ $fields->typeSelect == '1' ? 'selected' : '' }}>Substrate</option>
                <option value="2" {{ $fields->typeSelect == '2' ? 'selected' : '' }}>Ink</option>
                <option value="3" {{ $fields->typeSelect == '3' ? 'selected' : '' }}>Adhesive</option>
            </select>
        </td>
        <td class="field-material">
            <select class="form-select" id="materialSelect" name="materialSelect[]" disabled style="width: -webkit-fill-available !important">
                <option value="{{ $fields->materialSelect}}" selected disabled>{{ $fields->materialSelect}}</option>
            </select>
        </td>
        <td class="field-solid"><div class="have-percent" style="background: #e9ecef; "><input type="text" value="{{ $fields->{'solid-input'} }}" name="solid-input[]" class="solid-input form-control" disabled>
<span>%</span></div></td>
        <td class="field-micron"><input type="number" value="{{ $fields->{'micron-input'} }}" name="micron-input[]" class="form-control blue-field micron-input" disabled></td>
        <td class="field-density"><input type="number" value="{{ $fields->{'density-input'} }}" name="density-input[]" class="form-control density-input" disabled></td>
        <td class="field-total-gsm"><input type="number" value="{{ $fields->{'total-gsm-input'} }}" name="total-gsm-input[]"   class="form-control total-gsm-input" disabled></td>
        <td class="field-cost-per-kg"><input type="text" value="{{ $fields->{'cost-per-kg-input'} }}" name="cost-per-kg-input[]" class="form-control blue-field cost-per-kg-input" disabled></td>
        <td class="field-waste"><div class="have-percent blue-field"><input type="number" value="{{ $fields->{'waste-input'} }}" name="waste-input[]" class="form-control waste-input" disabled><span>%</span></div></td>
        <td class="field-cost-m"><input type="text" value="{{ $fields->{'cost-m-input'} }}" class="form-control cost-m-input" name="cost-m-input[]" disabled></td>
        <td class="field-required-kgs-estimated"><input value="{{ $fields->{'estimated-kg-req-input'} }}" type="text" name="estimated-kg-req-input[]"  class="estimated-kg-req-input form-control" disabled></td>
        <td class="field-lower"><input type="text" value="{{ $fields->{'lower-input'} }}" name="lower-input[]" class="form-control lower-input layer-input" readonly></td>
      </tr>
      @endforeach
      @endif

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
                </tr>

                <tr class="no-border-td">
                <td colspan="3"></td>
                <td colspan="3">
                    <h4 class="h4">Solvent-mix cost / kg</h4>
                </td>
                <td class="field-cost-per-kg">
                    <input type="number" name="cost-per-kg-last-value" class="cost-per-kg-last-value form-control blue-field" value="{{ $record->secondary->{'cost-per-kg-last-value'} }}" disabled>
                    <!--<input type="number" name="cost-per-kg-last-value" class="cost-per-kg-last-value form-control blue-field" value="1.50">-->
                </td>
                <td class="field-waste"></td>
                <td class="field-cost-m">
                    <input type="number" name="cost-m-last-field-tableless" class="cost-m-last-field-tableless form-control" value="{{ $record->secondary->{'cost-m-last-field-tableless'} }}" disabled>
                </td>
                <td class="field-required-kgs-estimated">
                    <input name="last-est-kg" type="text" value="{{ $record->secondary->{'last-est-kg'} }}" class="form-control last-est-kg" disabled>
                </td>
                <td class="field-lower"></td>
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
                            <input type="number" value="{{ $record->secondary->{'total-gsm-last-value'} }}" name="total-gsm-last-value" class="total-gsm-last-value form-control blue-field" readonly>
                        </div>
                    </div>
                </td>
                <td class="field-waste"></td>
                <td class="field-cost-m"></td>
                <td class="field-required-kgs-estimated"></td>
                <td class="field-lower"></td>
                </tr>
            </tbody>
        </table>

        </div>

        <div class="rm-details table-responsive">
        <table class="table table-bordered">
        <tbody>
            <tr>
            <td><label>Film Density</label></td>
            <td class="has-input"><input type="text" readonly name="film-density-input" class="film-density-input" value="{{ $record->secondary->{'film-density-input'} }}" readonly></td>
            <td><label>Pieces Per Kg</label></td>
            <td class="has-input"><input class="pieces-per-kg-field"  name="pieces-per-kg-field" type="text" value="{{ $record->secondary->{'pieces-per-kg-field'} }}" readonly></td>
            <td><label>Printing Film Width (mm)</label></td>
            <td class="has-input"><input type="text" value="{{ $record->secondary->{'printing-fil-width'} }}" name="printing-fil-width" class="printing-fil-width" readonly></td>
            </tr>
            <tr>
            <td><label>Total Micron</label></td>
            <td class="has-input"><input class="total-micron-input" value="{{ $record->secondary->{'total-micron-input'} }}" name="total-micron-input" type="text"  readonly></td>
            <td><label>Grams Per Piece</label></td>
            <td class="has-input"><input type="number" value="{{ $record->secondary->{'grams-per-peice'} }}" name="grams-per-peice" class="grams-per-peice" readonly></td>
            <td><label>Order Quantity In Kg</label></td>
            <td class="has-input"><input type="text"  name="orderQuantityInKgs" value="{{ $record->secondary->{'orderQuantityInKgs'} }}" readonly class="orderQuantityInKgs"></td>
            </tr>
            <tr>
            <td><label>Total GSM</label></td>
            <td class="has-input"><input type="number" value="{{ $record->secondary->{'total-gsm-calculated-value'} }}" name="total-gsm-calculated-value" class="total-gsm-calculated-value" readonly></td>
            <td><label>Square Meter Per Kg</label></td>
            <td class="has-input"><input class="square-meter-per-kg-input" name="square-meter-per-kg-input" type="text" value="{{ $record->secondary->{'square-meter-per-kg-input'} }}" readonly></td>
            <td><label>Order Quantity In Kpieces</label></td>
            <td class="has-input"><input name="orderQuanInKpieces" type="text" value="{{ $record->secondary->{'orderQuanInKpieces'} }}" class="orderQuanInKpieces" readonly></td>
            </tr>
            <tr>
            <td rowspan="2" style=" vertical-align: middle; "><label>Total Cost /M<sup>2</sup></label></td>
            <td rowspan="2" style=" vertical-align: middle; "class="has-input"><input type="text" name="total-cost-m-value" class="total-cost-m-value" value="{{ $record->secondary->{'total-cost-m-value'} }}" readonly></td>
            <td><label>Linear Meter Per Kg (Film Width)</label></td>
            <td class="has-input"><input type="text" value="{{ $record->secondary->{'linear-meter-per-kg'} }}" name="linear-meter-per-kg" class="linear-meter-per-kg" readonly></td>
            <td rowspan="2" style=" vertical-align: middle; "><label>Order Quantity In Meter</label></td>
            <td rowspan="2" style=" vertical-align: middle; "class="has-input"><input type="text" value="{{ $record->secondary->{'OrderQuanInMeter'} }}" name="OrderQuanInMeter" class="OrderQuanInMeter" readonly></td>
            </tr>

            <tr>
                <td><label>Linear Meter per Kg (Reel Width)</label></td>
                <td class="has-input"><input  name="hidden-field" class="hidden-field" value="{{ $record->secondary->{'hidden-field'} }}" readonly></td>
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
                        <td><div class="have-percent blue-field"><input type="number" value="{{ $record->secondary->{'core-inside'} }}" name="core-inside" class="form-control core-inside" readonly><span>mm</span></div></td>
                    </tr>
                    <tr>
                        <td>If Roll Outside Diameter (With Core)</td>
                        <td><div class="have-percent blue-field "><input type="number" value="{{ $record->secondary->{'roll-outside-diameter'} }}" name="roll-outside-diameter" class="form-control roll-outside-diameter" readonly><span>mm</span></div></td>
                    </tr>
                    <tr>
                        <td>Film On Roll Weight</td>
                        <td><div class="have-percent grey-bg"><input type="text" value="{{ $record->secondary->{'film-on-roll-weight'} }}" class="form-control film-on-roll-weight" name="film-on-roll-weight" readonly><span>kgs</span></div></td>
                    </tr>
                    <tr>
                        <td>Film On Roll: Length In Meter</td>
                        <td><div class="have-percent grey-bg"><input type="text" value="{{ $record->secondary->{'film-on-roll-length'} }}" name="film-on-roll-length" class="form-control film-on-roll-length" readonly><span>Mtr</span></div></td>
                    </tr>
                    <tr>
                        <td>Roll Width</td>
                        <td><div class="have-percent grey-bg"><input type="text" name="roll-width" value="{{ $record->secondary->{'roll-width'} }}"  class="form-control roll-width" readonly><span>mm</span></div></td>
                    </tr>
                    <tr>
                        <td>Pieces Per Roll</td>
                        <td><input type="text" name="pieces-per-roll" class="input-box pieces-per-roll" value="{{ $record->secondary->{'pieces-per-roll'} }}" readonly style="background: #e9ecef !important;text-align: right !important;border-radius: 5px !important;"></td>
                    </tr>
                    <tr style="margin-top: 20px;">
                        <td>If Required Roll Weight (Without Core)</td>
                        <td><div class="have-percent blue-field"><input type="number" value="{{ $record->secondary->{'required-roll-weight-kg'} }}" name="required-roll-weight-kg" class="form-control required-roll-weight-kg" readonly><span>kgs</span></div></td>
                    </tr>
                    <tr>
                        <td>Roll Outside Diameter</td>
                        <td><div class="have-percent grey-bg"><input type="text" value="{{ $record->secondary->{'core-inside-roll'} }}" name="core-inside-roll" class="form-control core-inside-roll" readonly><span>mm</span></div></td>
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
                        <input type="checkbox" class="form-check-input" name="extrusion-check" {{ ($record->secondary->{'extrusion-check'} == 'on') ? 'checked' : '' }} disabled >
                        <span>Extrusion</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text"  value="{{ $record->secondary->{'first-speed'} ?? 0 }}" name="first-speed" class="first-speed blue-field extrusion-speed" readonly></td>
                    <td class="has-input"><input type="text" value="{{ $record->secondary->{'first-setup'} ?? 0 }}" name="first-setup" class="hour-format first-setup blue-field extrusion-setup-hour" readonly></td>
                    <td class="has-input"><input type="text" value="{{ (!empty($record->secondary->{'first-hour'}) && $record->secondary->{'first-hour'} != 0) ? $record->secondary->{'first-hour'} : '0.00' }}" class="first-hour" name="first-hour" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'first-process-cost'} ?? 0}}" class="blue-field extrusion-process-cost first-process-cost" name="first-process-cost" readonly></td>
                    <td class="has-input"><input type="text" value="{{ $record->secondary->{'process-cost-one'} ?? 0 }}" name="process-cost-one" class="process-cost-field process-cost-one" readonly ></td>
                    <td rowspan="10" class="total-cost has-input"><input class="total-process-cost" name="total-process-cost" type="text" value="{{ $record->secondary->{'total-process-cost'} ?? 0 }}" readonly> </td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input" name="printing-check" {{ ($record->secondary->{'printing-check'} == 'on') ? 'checked' : '' }} disabled>
                        <span>Printing</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" id="1s" value="{{ $record->secondary->{'second-speed'} ?? 0 }}" name="second-speed" class="second-speed blue-field printing-speed speed-feild" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'second-setup'} ?? 0 }}" name="second-setup" class="hour-format second-setup blue-field printing-setup-hour setup-hour" readonly></td>
                    <td class="has-input">
                    <input type="text" value="{{ (!empty($record->secondary->{'second-hour'}) && $record->secondary->{'second-hour'} != 0) ? $record->secondary->{'second-hour'} : '0.00' }}" name="second-hour" class="second-hour" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'second-process-cost'} ?? 0 }}" class="blue-field second-process-cost" name="second-process-cost"></td>
                    <td class="has-input"><input type="text" name="process-cost-two" class="process-cost-two process-cost-field" value="{{ $record->secondary->{'process-cost-two'} ?? 0 }}" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input" name="rewinding-check" {{ ($record->secondary->{'rewinding-check'} == 'on') ? 'checked' : '' }} disabled>
                        <span>rewinding</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" id="2s" value="{{ $record->secondary->{'third-speed'} ?? 0 }}" name="third-speed" class="third-speed blue-field rewinding-speed speed-feild" readonly></td>
                    <td class="has-input"><input type="number" name="third-setup" value="{{ $record->secondary->{'third-setup'} ?? 0 }}" class="third-setup hour-format blue-field  rewinding-setup-hour setup-hour" readonly></td>
                    <td class="has-input"><input type="text" value="{{ (!empty($record->secondary->{'third-hour'}) && $record->secondary->{'third-hour'} != 0) ? $record->secondary->{'third-hour'} : '0.00' }}" name="third-hour" class="third-hour" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'third-process-cost'} ?? 0 }}" name="third-process-cost" class="blue-field third-process-cost" readonly></td>
                    <td class="has-input"><input type="text" value="{{ $record->secondary->{'process-cost-three'} ?? 0 }}" class="process-cost-three process-cost-field" name="process-cost-three" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input" name="lamination-1-check" {{ ($record->secondary->{'lamination-1-check'} == 'on') ? 'checked' : '' }} disabled>
                        <span>lamination 1</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="{{ $record->secondary->{'fourth-speed'} ?? 0 }}" name="fourth-speed" class="fourth-speed blue-field lamination-1-speed speed-feild"  readonly></td>
                    <td class="has-input"><input type="number"  value="{{ $record->secondary->{'fourth-setup'} ?? 0 }}" name="fourth-setup" class="fourth-setup hour-format blue-field setup-hour lamination-1-setup-hour" readonly></td>
                    <td class="has-input"><input type="text" value="{{ (!empty($record->secondary->{'fourth-hour'}) && $record->secondary->{'fourth-hour'} != 0) ? $record->secondary->{'fourth-hour'} : '0.00' }}" name="fourth-hour" class="fourth-hour" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'fourth-process-cost'} ?? 0 }}" name="fourth-process-cost" class="blue-field fourth-process-cost" readonly></td>
                    <td class="has-input"><input type="text" name="process-cost-four" class="process-cost-four process-cost-field" value="{{ $record->secondary->{'process-cost-four'} ?? 0 }}" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input" name="lamination-2-check" {{ ($record->secondary->{'lamination-2-check'} == 'on') ? 'checked' : '' }} disabled>
                        <span>lamination 2</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="{{ $record->secondary->{'fifth-speed'} ?? 0 }}" name="fifth-speed" class="fifth-speed blue-field lamination-2-speed speed-feild" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'fifth-setup'} ?? 0 }}" name="fifth-setup" class="fifth-setup lamination-2-setup-hour blue-field setup-hour hour-format" readonly></td>
                    <td class="has-input"><input type="text" value="{{ (!empty($record->secondary->{'fifth-hour'}) && $record->secondary->{'fifth-hour'} != 0) ? $record->secondary->{'fifth-hour'} : '0.00' }}" class="fifth-hour" name="fifth-hour" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'fifth-process-cost'} ?? 0 }}" name="fifth-process-cost" class="blue-field fifth-process-cost" readonly></td>
                    <td class="has-input"><input type="text" name="process-cost-fifth" value="{{ $record->secondary->{'process-cost-fifth'} ?? 0 }}" class="process-cost-fifth process-cost-field" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input" name="lamination-3-check" {{ ($record->secondary->{'lamination-3-check'} == 'on') ? 'checked' : '' }} disabled>
                        <span>lamination 3</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="{{ $record->secondary->{'six-speed'} ?? 0 }}" name="six-speed" class="six-speed blue-field lamination-3-speed speed-feild" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'six-setup'} ?? 0 }}" name="six-setup" class="hour-format six-setup blue-field lamination-3-setup-hour setup-hour" readonly></td>
                    <td class="has-input"><input type="text" value="{{ (!empty($record->secondary->{'six-hour'}) && $record->secondary->{'six-hour'} != 0) ? $record->secondary->{'six-hour'} : '0.00' }}" name="six-hour" class="six-hour" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'six-process-cost'} ?? 0 }}" name="six-process-cost" class="blue-field six-process-cost" readonly></td>
                    <td class="has-input"><input type="text" value="{{ $record->secondary->{'process-cost-six'} ?? 0 }}" class="process-cost-six process-cost-field" name="process-cost-six" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input" name="slitting-check" {{ ($record->secondary->{'slitting-check'} == 'on') ? 'checked' : '' }} disabled>
                        <span>Slitting</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="{{ $record->secondary->{'seven-speed'} ?? 0 }}" name="seven-speed" class="seven-speed blue-field slitting-speed speed-feild" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'seven-setup'} ?? 0 }}" name="seven-setup" class="hour-format seven-setup slitting-setup-hour blue-field setup-hour" readonly></td>
                    <td class="has-input"><input type="text" value="{{ (!empty($record->secondary->{'seven-hour'}) && $record->secondary->{'seven-hour'} != 0) ? $record->secondary->{'seven-hour'} : '0.00' }}" class="seven-hour" name="seven-hour" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'seven-process-cost'} ?? 0 }}" name="seven-process-cost" class="blue-field seven-process-cost" readonly></td>
                    <td class="has-input"><input type="text" value="{{ $record->secondary->{'process-cost-seven'} ?? 0 }}" class="process-cost-seven process-cost-field" name="process-cost-seven" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input" name="sleeving-check" {{ ($record->secondary->{'sleeving-check'} == 'on') ? 'checked' : '' }} disabled>
                        <span>Sleeving</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="{{ $record->secondary->{'eight-speed'} ?? 0 }}" name="eight-speed" class="eight-speed blue-field sleeving-speed speed-feild" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'eight-setup'} ?? 0 }}" name="eight-setup" class="hour-format eight-setup sleeving-setup-hour blue-field setup-hour" readonly></td>
                    <td class="has-input"><input type="text" value="{{ (!empty($record->secondary->{'eight-hour'}) && $record->secondary->{'eight-hour'} != 0) ? $record->secondary->{'eight-hour'} : '0.00' }}" class="eight-hour" name="eight-hour" readonly></td>
                    <td class="has-input"><input type="text" value="{{ $record->secondary->{'eight-process-cost'} ?? 0 }}" name="eight-process-cost" class="blue-field eight-process-cost" readonly></td>
                    <td class="has-input"><input type="text" value="{{ $record->secondary->{'process-cost-eight'} ?? 0 }}" class="process-cost-eight process-cost-field" name="process-cost-eight" readonly></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input" name="doctoring-check" {{ ($record->secondary->{'doctoring-check'} == 'on') ? 'checked' : '' }} disabled>
                        <span>Sleeve Doctoring</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="{{ $record->secondary->{'nine-speed'} ?? 0 }}" name="nine-speed" class="nine-speed blue-field speed-feild doctoring-speed" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'nine-setup'} ?? 0 }}" name="nine-setup" class="nine-setup blue-field setup-hour doctoring-setup-hour hour-format" readonly></td>
                    <td class="has-input"><input type="text" value="{{ (!empty($record->secondary->{'nine-hour'}) && $record->secondary->{'nine-hour'} != 0) ? $record->secondary->{'nine-hour'} : '0.00' }}" class="nine-hour" name="nine-hour" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'nine-process-cost'} ?? 0 }}" name="nine-process-cost" class="blue-field nine-process-cost" readonly></td>
                    <td class="has-input"><input type="text" name="process-cost-nine" class="process-cost-nine process-cost-field" value="{{ $record->secondary->{'process-cost-nine'} ?? 0 }}" readonly></td>
                </tr>
                                    <tr>
                        <td class="has-checkbox checkbox-field">
                        <label class="checkbox-label">
                            <input type="checkbox" class="form-check-input" name="pouch-making-check" {{ ($record->secondary->{'pouch-making-check'} == 'on') ? 'checked' : '' }} disabled>
                            <span>Pouch Making</span>
                        </label>
                        </td>
                        <td class="has-input"><input type="text" value="{{ $record->secondary->{'ten-speed'} ?? 0 }}" name="ten-speed" class="ten-speed blue-field pouch-speed-feild pouch-speed" readonly></td>
                        <td class="has-input"><input type="number" value="{{ $record->secondary->{'ten-setup'} ?? 0 }}" name="ten-setup" class="ten-setup blue-field setup-hour doctoring-setup-hour hour-format" readonly></td>
                        <td class="has-input"><input type="text" value="{{ (!empty($record->secondary->{'ten-hour'}) && $record->secondary->{'ten-hour'} != 0) ? $record->secondary->{'ten-hour'} : '0.00' }}" class="ten-hour" name="ten-hour" readonly></td>
                        <td class="has-input"><input type="number" value="{{ $record->secondary->{'ten-process-cost'} ?? 0 }}" name="ten-process-cost" class="blue-field ten-process-cost" readonly></td>
                        <td class="has-input"><input type="text" name="process-cost-ten" class="process-cost-ten process-cost-field" value="{{ $record->secondary->{'process-cost-ten'} ?? 0 }}" readonly></td>
                    </tr>
                    <tr style="border: 0;">
                        <td colspan="5" style="border: 0;"></td>
                        <td style="border: 0;"><h4 style="font-size: 17px;margin-bottom: 0;text-align: center;">Operation Cost Per Kg</h4></td>
                        <td class="has-input" style="border: 0;"><input class="opearion-cost-per-kg" name="opearion-cost-per-kg" type="number" value="{{ $record->secondary->{'opearion-cost-per-kg'} !=='' ? $record->secondary->{'opearion-cost-per-kg'} : '0.00' }}" readonly> </td>
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
                    <th class="th-has-tag"><span>Markup</span><input type="number" class="markupPercent blue-field" name="markupPercent" value="{{ $record->secondary->{'markupPercent'} }}" readonly>%</th>
                    <th>Plates / cylinders cost</th>
                    <th>Delivery Cost</th>
                    <th>operation cost</th>
                    <th>Sale Price</th>
                </tr>
                </thead>
                
                <tbody>
                <tr>
                    <td class="has-label"><label>per kg</label></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'first-per-kg-value'} }}" name="first-per-kg-value" class="per-kg-field" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'second-per-kg-value'} }}" name="second-per-kg-value" class="second-per-kg-value" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'third-per-kg-value'} }}" name="third-per-kg-value" class="third-per-kg-value blue-field" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'fourth-per-kg'} }}" name="fourth-per-kg" class="fourth-per-kg blue-field" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'fifth-per-kg'} }}"  name="fifth-per-kg" class="blue-field fifth-per-kg" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'six-kg'} }}" name="six-kg" class="blue-field six-kg" readonly></td>
                </tr>
                <tr>
                    <td class="has-label"><label>per kpcs</label></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'perKpcsFirst'} }}" name="perKpcsFirst" class="perKpcs" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'perKpcsSecond'} }}" name="perKpcsSecond" class="perKpcsSecond" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'perKpcsthird'} }}" name="perKpcsthird" class="perKpcsthird" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'perkpcsfourth'} }}" name="perkpcsfourth" class="perkpcsfourth" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'fifth-kpcs'} }}" name="fifth-kpcs" class="fifth-kpcs" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'six-kpcs'} }}" name="six-kpcs" class="blue-field six-kpcs" readonly></td>
                </tr>
                <tr>
                    <td class="has-label"><label>per SQM</label></td>
                    <td class="has-input"><input class="per-sqm-field" name="FirstPerSqm" type="number" value="{{ $record->secondary->{'FirstPerSqm'} }}" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'secondPerSqm'} }}" class="secondPerSqm" name="secondPerSqm" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'ThirdPerSqm'} }}" class="ThirdPerSqm" name="ThirdPerSqm" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'fourthPerSqm'} }}" name="fourthPerSqm" class="fourthPerSqm" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'fifth-sqm'} }}" class="fifth-sqm" name="fifth-sqm" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'six-sqm'} }}" name="six-sqm" class="six-sqm blue-field" readonly></td>
                </tr>
                <tr>
                    <td class="has-label"><label>per LM</label></td>
                    <td class="has-input"><input type="number" name="perLmValue" value="{{ $record->secondary->{'perLmValue'} }}" class="perLmValue" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'secondPerLM'} }}" class="secondPerLM" name="secondPerLM" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'thirdPerLM'} }}" name="thirdPerLM" class="thirdPerLM" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'fourthLm'} }}" name="fourthLm" class="fourthLm" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'fifth-lm'} }}" class="fifth-lm" name="fifth-lm" readonly></td>
                    <td class="has-input"><input type="number" value="{{ $record->secondary->{'six-lm'} }}" class="blue-field six-lm" name="six-lm" readonly></td>
                </tr>
                <tr>
                        <td class="has-label"><label>Per Roll 500 LM</label></td>
                        <td class="has-input"><input type="number" name="firstPerRoll" value="{{ $record->secondary->{'firstPerRoll'} ?? '0.00' }}" class="firstPerRoll" readonly></td>
                        <td class="has-input"><input type="number" value="{{ $record->secondary->{'secondPerRoll'} ?? '0.00' }}" class="secondPerRoll" name="secondPerRoll" readonly></td>
                        <td class="has-input"><input type="number" value="{{ $record->secondary->{'thirdPerRoll'} ?? '0.00' }}" name="thirdPerRoll" class="thirdPerRoll" readonly></td>
                        <td class="has-input"><input type="number" value="{{ $record->secondary->{'fourthPerRoll'} ?? '0.00' }}" name="fourthPerRoll" class="fourthPerRoll" readonly></td>
                        <td class="has-input"><input type="number" value="{{ $record->secondary->{'fifthPerRoll'} ?? '0.00' }}" class="fifthPerRoll" name="fifthPerRoll" readonly></td>
                        <td class="has-input"><input type="number" value="{{ $record->secondary->{'sixPerRoll'} ?? '0.00' }}" class="blue-field sixPerRoll" name="sixPerRoll" readonly></td>
                </tr>
                </tbody>
            </table>
        </div>
    </div>


    <div class="mt-5">
        <h2 class="h2" style="margin-bottom: 20px;">Actual Vs Estimation</h2>
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
                            <div class="have-percent blue-field"><input type="text" value="{{ $record->secondary->{'final-output'} ?? '0' }}" name="final-output" class="final-output" style="min-" readonly><span>Kgs</span></div>
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
                        @if(!empty($record->secondArrayFields))
                        @foreach($record->secondArrayFields as $fields)
                        <tr id="lower-row-{{$fields->row_id}}">
                            <td><input type="hidden" value="{{$fields->row_id}}" name="row_id[]">
                                <input type="text" value="{{ $fields->{'actual-material'}  }}" id="{{$fields->row_id}}" name="actual-material[]" class="actual-material" readonly>
                            </td>
                            <td><input type="text" value="{{ $fields->{'actual-consumption'}  }}" id="{{$fields->row_id}}" name="actual-consumption[]" class="actual-consumption blue-field" readonly> </td>
                            <td><input type="number" value="{{ $fields->{'actual-cost-per-kg'}  }}" id="{{$fields->row_id}}" name="actual-cost-per-kg[]" class="actual-cost-per-kg" readonly></td>
                            <td><input type="text" value="{{ $fields->{'actual-total-amount'}  }}" id="{{$fields->row_id}}" name="actual-total-amount[]" class="actual-total-amount" readonly></td>
                            <td style="padding: 0;border: 0;"><input class="hidden-field-value" name="hidden-field-value[]" value="{{ $fields->{'hidden-field-value'}  }}" hidden></td>
                        </tr>
                        @endforeach
                        @endif
                        <tr>
                            <td><input type="text" value="Solvent - Mix" name="actual-material-solvent" class="actual-material-solvent" readonly></td>
                            <td><input type="text" value="{{ $record->secondary->{'actual-consumption-solvent'} ?? '0' }}" name="actual-consumption-solvent" class="actual-consumption-solvent blue-field"></td>
                            <td><input type="number" value="{{ $record->secondary->{'actual-cost-per-kg-solvent'} ?? '0' }}" name="actual-cost-per-kg-solvent" class="actual-cost-per-kg-solvent" readonly></td>
                            <td><input type="text" value="{{ $record->secondary->{'actual-total-amount-solvent'} ?? '0' }}" name="actual-total-amount-solvent" class="actual-total-amount-solvent" readonly></td>
                            <td style="visibility: hidden;border-color: transparent;padding:0;" > <input type="text" value="{{ $record->secondary->{'solvent-mix-hidden-field'} ?? '0' }}" name="solvent-mix-hidden-field" class="solvent-mix-hidden-field" readonly hidden></td>
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
                            <td style="border-top: 1px solid #dee2e6 !important;"><input type="text" name="last-total-amount-one" class="last-total-amount-one" value="{{ $record->secondary->{'last-total-amount-one'} ?? '0' }}"  readonly style="font-weight: 600;"></td>
                        </tr>
                        <tr>
                            <td colspan="3" style="text-align:right !important;color: #1363a6;font-weight: 600;"><label>Actual Raw Material Cost Per Kg ---></label></td>
                            <td><input type="number" value="{{ $record->secondary->{'actual-raw-material-cost-one'} ?? '0' }}" class="actual-raw-material-cost-one" name="actual-raw-material-cost-one"  readonly style="font-weight: 600;"></td>
                        </tr>
                        <tr>
                            <td colspan="3" style="text-align:right !important;color: #1363a6;font-weight: 600;"><label>Difference ---></label></td>
                            <td><input type="text" value="{{ $record->secondary->{'last-difference-one'} ?? '0' }}%" name="last-difference-one" class="last-difference-one"  readonly style="font-weight: 600;"></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="graph graph-col graph1">
                <canvas id="barChart"></canvas>
            </div>

        </div>
    </div>

            <div class="last-div total-cost py-5">
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
                @if(!empty($record->thirdArrayFields))
                @foreach($record->thirdArrayFields as $fields)

                <tr data-process="{{ $fields->{'process-name'} }}">
                    <td class="has-input"><input type="text" value="{{ $fields->{'process-name'} }}" name="process-name[]" class="process-name" readonly=""></td>
                    <td class="has-input"><input type="number" value="{{ $fields->{'actual-hours'} }}" name="actual-hours[]" class="blue-field actual-hours" readonly=""></td>
                    <td class="has-input"><input type="number" value="{{ $fields->{'process-cost-hour'} }}" name="process-cost-hour[]" class="process-cost-hour" readonly=""></td>
                    <td class="has-input"><input type="text" value="{{ $fields->{'total-amount-actual'} }}" name="total-amount-actual[]" class="total-amount-actual" readonly=""></td>
                    <td hidden><input type="text" value="{{ $fields->{'hidden-value'} }}" name="hidden-value[]" class="hidden-value" readonly="" hidden> </td>
                </tr>

                @endforeach
                @endif
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
                        <td style="border-top: 1px solid #dee2e6 !important;"><input type="text" name="last-total-amount-two" class="last-total-amount-two" value="{{ $record->secondary->{'last-total-amount-two'} ?? '0' }}"  readonly style="font-weight: 600;"></td>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align:right !important;color: #1363a6;font-weight: 600;"><label>Actual Operation Cost Per Kg ---></label></td>
                        <td><input type="number" value="{{ $record->secondary->{'actual-raw-material-cost-two'} ?? '0.00' }}" class="actual-raw-material-cost-two" name="actual-raw-material-cost-two"  readonly style="font-weight: 600;"></td>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align:right !important;color: #1363a6;font-weight: 600;"><label>Difference ---></label></td>
                        <td style="overflow:hidden;"><input type="text" value="{{ $record->secondary->{'last-difference-two'} ?? '0.00' }}%" name="last-difference-two" class="last-difference-two"  readonly style="font-weight: 600;"></td>
                    </tr>
                </tbody>
            </table>


              <div class="graph graph-col graph1">
                <canvas id="secondbarChart"></canvas>
            </div>

        </div>
    </div>

            <div  style="padding: 3rem 0;">
        <div class="table-responsive">
            <table class="table-bordered table" style="max-width: 500px;margin: 0 auto 3rem;">
                <thead>
                    <td style="text-align: center; min-width: 150px;background: #1363A6; color: #FFF;font-weight: 500;">Sales Price</td>
                    <td style="border: 1px solid #dee2e6; background: #d2edff;text-align: center;"><input type="number" class="lastSalesPrice" value="{{ $record->secondary->lastSalesPrice ?? '0.00' }}" style="background: #d2edff;" readonly></td>
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
                                <input type="number" value="{{ $record->secondary->{'estimation-total-cost'} ?? '0' }}" name="estimation-total-cost" class="estimation-total-cost" readonly
                                    style="text-align: center !important;">
                            </td>
                            <td>
                                <input type="text" value="{{ $record->secondary->firstPercentage ?? '0.0 %' }} " name="firstPercentage" class="firstPercentage" readonly
                                    style="text-align: center !important;width: fit-content;">
                            </td>
                            <td rowspan="2">
                                <div style="display: table;height: 63px;">
                                    <div style="display: table-cell;border-right: 1px solid #dee2e6;vertical-align: middle;">
                                        <input type="text" value="{{ $record->secondary->firstDifferenceValue ?? '0.00' }}" name="firstDifferenceValue" class="firstDifferenceValue" readonly
                                        style="text-align: center !important;">
                                    </div>
                                    <div style="display: table-cell;vertical-align: middle;">
                                        <input type="text" value="{{ $record->secondary->secondDifferenceValue ?? '0.0 %' }} " name="secondDifferenceValue" class="secondDifferenceValue" readonly
                                        style="text-align: center !important;">
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr><input type="number" value="{{ $record->secondary->{'actual-difference'} ?? '0' }}" class="actual-difference" name="actual-difference"  hidden>
                            <td style="border-top: 1px solid #dee2e6">Actual Total Cost </td>
                            <td>
                                <input type="number" value="{{ $record->secondary->{'actual-total-cost'} ?? '0' }}" name="actual-total-cost" class="actual-total-cost" readonly
                                    style="text-align: center !important;">
                            </td>
                            <td>
                                <input type="text" value="{{ $record->secondary->secondPercentage ?? '0.0 %' }} " name="secondPercentage" class="secondPercentage" readonly
                                    style="text-align: center !important;width: fit-content;">
                            </td>
                        </tr>
                        <tr style="border-bottom: 0;">
                            <td style="border-top: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;">Estimated Margin</td>
                            <td style="border-bottom: 1px solid #dee2e6;">
                                <input type="text" value="{{ $record->secondary->estimatedMargin ?? '0.00' }}" name="estimatedMargin" class="estimatedMargin" readonly
                                    style="text-align: center !important;">
                            </td>
                            <td style="border-bottom: 1px solid #dee2e6;">
                                <input type="text" value="{{ $record->secondary->thirdPercentage ?? '0.0 %' }}" name="thirdPercentage" class="thirdPercentage" readonly
                                    style="text-align: center !important;width: fit-content;">
                            </td>
                        </tr>
                        <tr style="border-top: 0;border-bottom: 0;">
                            <td style="border-top: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;">Actual Margin</td>
                            <td style="border-bottom: 1px solid #dee2e6;">
                                <input type="text" value="{{ $record->secondary->actualMargin ?? '0.00'}}" name="actualMargin" class="actualMargin" readonly
                                    style="text-align: center !important;">
                            </td>
                            <td style="border-bottom: 1px solid #dee2e6;">
                                <input type="text" value="{{ $record->secondary->fourthPercentage ?? '0.00 %'}} " name="fourthPercentage" class="fourthPercentage" readonly
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
                        <td>
                                <textarea style="text-align: center !important; width: 100%;" rows="10" readonly>{{ $record->secondary->remarks ?? '' }}</textarea>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

</form>

    </div> <!-- container div end -->
    </section>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
<script>

document.addEventListener('DOMContentLoaded', function () {
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


        initializeChart();



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
    updateChart();



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


    // Call the function after declaring it
    initializesecondChart();

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

    updateSecondChart();




    
});


</script>
<script>
function generatePDF() {
    let canvas = document.getElementById('barChart'); // Change 'myChart' to your chart's ID
    let secondCanvas = document.getElementById('secondbarChart');

    if (!canvas) {
        alert("Chart not found!");
        return;
    }

    let chartImage = canvas.toDataURL('image/png'); // Convert canvas to Base64
    document.getElementById('chartInput').value = chartImage; // Set it in hidden input

    let secondChartImage = secondCanvas.toDataURL('image/png'); // Convert canvas to Base64
    document.getElementById('secondChartInput').value = secondChartImage; // Set it in hidden input

    document.getElementById('pdfForm').submit(); // Submit the form
}
</script>
@endsection




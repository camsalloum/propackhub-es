@extends('layouts.custom')

@section('content')

<section class="hero-one">
        <div class="container-fluid">
            <div class="top-btns d-flex justify-content-center mb-3">
                <button class="btn btn-save btn-before">Save</button>
                <button class="btn btn-reset btn-before">Reset Form</button>
                <button class="btn btn-pdf btn-before">Save PDF</button>
            </div>
            <h2 class="title text-center">Flexible Packaging <br>Cost And Materials Estimation</h2>

            <form class="form_one customer-name">
            <div class="form-group">
                <label for="customerName" class="form-label">Customer Name:</label>
                <input type="text" class="form-control" id="customerName">
            </div>

            <div class="form-group job-name">
                <label for="jobName" class="form-label">Job Name:</label>
                <input type="text" class="form-control" id="jobName" >
            </div>

            <div class="form-group product-type">
                <label for="productType" class="form-label">Product Type:</label>
                <select class="form-select" id="productType">
                    <option value="roll" selected>Roll</option>
                    <option value="sleeve">Sleeve</option>
                    <option value="bag/pouch">Bag/Pouch</option> 
                </select>
            </div>

            <div class="form-group order-quantity">
                <label for="orderQuantity" class="form-label">Order Quantity:</label>
                <div class="input-group">
                    <input type="number" class="form-control" id="orderQuantity">
                    <select class="form-select">
                        <option value="" selected disabled hidden></option>
                        <option value="kgs">Kgs</option>
                        <option value="kpcs">Kpcs</option>
                        <option value="sqm">SQM</option>
                        <option value="lm">LM</option>
                    </select>
                </div>
            </div>
        </form>
        </div>
    </section>

    <section style="background: #EEF8FF;" class="py-4 mt-3">
        <div class="container-fluid">

            <!-- Roll Table -->
            <div class="table-responsive result-tables roll-table">
                <table class="table table-bordered myTable">
                    <thead>
                        <tr>
                            <th colspan="2">Roll Dimensions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Reel Width</td>
                            <td class="has-input"><input type="text"></td>
                        </tr>
                        <tr>
                            <td>Cut Off</td>
                            <td class="has-input"><input type="text"></td>
                        </tr>
                        <tr>
                            <td>Pieces per Cut</td>
                            <td class="has-input"><input type="text"></td>
                        </tr>
                        <tr>
                            <td>Number Of Ups</td>
                            <td class="has-input"><input type="text"></td>
                        </tr>
                        <tr>
                            <td>Extra Printing Trim</td>
                            <td class="has-input"><input type="text"></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Sleeve Table -->
            <div class="table-responsive result-tables sleeve-table" hidden>
                <table class="table table-bordered myTable">
                    <thead>
                        <tr>
                            <th colspan="2">Sleeve Dimensions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Lay Flat</td>
                            <td class="has-input"><input type="text"></td>
                        </tr>
                        <tr>
                            <td>Reel Width</td>
                            <td class="has-input"><input type="text"></td>
                        </tr>
                        <tr>
                            <td>Cut Off</td>
                            <td class="has-input"><input type="text"></td>
                        </tr>
                        <tr>
                            <td>Pieces per Cut</td>
                            <td class="has-input"><input type="text"></td>
                        </tr>
                        <tr>
                            <td>Number Of Ups</td>
                            <td class="has-input"><input type="text"></td>
                        </tr>
                        <tr>
                            <td>Extra Printing Trim</td>
                            <td class="has-input"><input type="text"></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Bag/Pouch Table -->
            <div class="pouch-zipper-table" hidden>
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
                                <td>Open Height (with Gusset)</td>
                                <td class="has-input"><input type="text"></td>
                            </tr>
                            <tr>
                                <td>Open Width (with Gusset)</td>
                                <td class="has-input"><input type="text"></td>
                            </tr>
                            <tr>
                                <td>Number Of Ups</td>
                                <td class="has-input"><input type="text"></td>
                            </tr>
                            <tr>
                                <td>Extra Printing Trim</td>
                                <td class="has-input"><input type="text"></td>
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
                                <td>Weight of 1 Meter Zipper</td>
                                <td class="has-input"><input type="text"></td>
                            </tr>
                            <tr>
                                <td>Cost of 1 Meter Zipper</td>
                                <td class="has-input"><input type="text"></td>
                            </tr>
                            <tr>
                                <td>Cost of 1 gr Zipper</td>
                                <td class="has-input"><input type="text"></td>
                            </tr>
                            <tr>
                                <td>Zipper Weight per Pouch</td>
                                <td class="has-input"><input type="text"></td>
                            </tr>
                            <tr>
                                <td>Zipper Cost per Pouch</td>
                                <td class="has-input"><input type="text"></td>
                            </tr>
                            <tr>
                                <td>Zipper Cost 1 kg</td>
                                <td class="has-input"><input type="text"></td>
                            </tr>
                            <tr>
                                <td>Quantity Required of Zippers</td>
                                <td class="has-input has-two-input"><input type="text"><input type="text" style="border-top: 1px solid #1363a680;"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </section>


    <section class="raw-material myTable">
        <div class="container-fluid">
        <div class="top-bar d-flex justify-content-between align-items-center">
            <h2 class="h2">Raw Material Cost</h2>
            <button class="btn btn-before">Add More Row</button>
        </div>
        <div class="raw-mt-table table-responsive mb-4">
        <table class="table table-bordered text-center">
    <thead>
      <tr>
        <th>Type</th>
        <th>Material</th>
        <th>Solid</th>
        <th>Micron</th>
        <th>Density</th>
        <th>Total GSm</th>
        <th>Cost per Kg</th>
        <th>Waste</th>
        <th>Cost/M</th>
        <th>Required Kgs (Estimated)</th>
        <th>Lower</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="field-type">
          <select class="form-select">
            <option value="" selected disabled hidden ></option>
            <option value="1">Type 1</option>
            <option value="2">Type 2</option>
            <option value="3">Type 3</option>
          </select>
        </td>
        <td class="field-material">
          <select class="form-select">
            <option value="" selected disabled hidden></option>
            <option value="1">Material 1</option>
            <option value="2">Material 2</option>
            <option value="3">Material 3</option>
          </select>
        </td>
        <td class="field-solid"><div class="have-percent"><input type="number" class="form-control"><span>%</span></div></td>
        <td class="field-micron"><input type="text" class="form-control blue-field"></td>
        <td class="field-density"><input type="text" class="form-control"></td>
        <td class="field-total-gsm"><input type="text" value="0.0000" class="form-control"></td>
        <td class="field-cost-per-kg"><input type="text" class="form-control blue-field"></td>
        <td class="field-waste"><div class="have-percent blue-field"><input type="number" class="form-control"><span>%</span></div></td>
        <td class="field-cost-m"><input type="text" class="form-control"></td>
        <td class="field-required-kgs-estimated"><input type="text" class="form-control"></td>
        <td class="field-lower"><input type="text" class="form-control"></td>
        <td class="field-action"><button type="button" class="btn btn-cancel"><i class="fas fa-times"></i></button></td>
      </tr>
      </tbody>
        </table>

        <table class=" text-center table-footer">
        <tbody>
      <tr>
        <td class="field-type"><input hidden></td>
        <td class="field-type"><input hidden> </td>
        <td class="field-solid"><div hidden ></div></td>
        <td class="field-micron sovent" ><h4>Solvent-mix cost / kg</h4></td>
        <td class="field-cost-per-kg"><input type="number" class="form-control blue-field" value="1.50"></td>
        <td class="field-waste"><div hidden ></div></td>
        <td class="field-cost-m"><input type="number" class="form-control" value="0.0000"></td>
        <td class="field-required-kgs-estimated"><input type="number" value="0.0000" class="form-control"></td>
        <td class="field-lower"><input hidden ></td>
        <td class="field-action"><input hidden ></td>
      </tr>
      <tbody>
      <tr>
        <td class="field-type"><input hidden> </td>
        <td class="field-type"><input hidden> </td>
        <td class="field-solid"><div hidden ></div></td>
        <td class="field-micron sovent" ><h5>Solvent - based inks & adhesives ratio to solvent mix</h5></td>
        <td class="field-cost-per-kg">
            <div class="based-ink-res">
                <div class="top-field">
                    <input type="number" class="form-control" value="1">
                </div>
                <div class="btm-field">
                    <input type="number" class="form-control blue-field">
                </div>
            </div>
        </td>
        <td class="field-waste"><div  hidden ></div></td>
        <td class="field-cost-m"><input hidden></td>
        <td class="field-required-kgs-estimated"><input hidden></td>
        <td class="field-lower"><input hidden ></td>
        <td class="field-action"><input hidden ></td>
      </tr>
      </tbody>
        </table>
        </div>

    <div class="rm-details table-responsive">
        <table class="table table-bordered">
        <tbody>
            <tr>
            <td><label>Film Density</label></td>
            <td class="has-input"><input type="text" value="NaN G/Cm³"></td>
            <td><label>Pieces Per Kg</label></td>
            <td class="has-input"><input type="text" value="0.000"></td>
            <td><label>Printing Film Width</label></td>
            <td class="has-input"><input type="text" value="0.000"></td>
            </tr>
            <tr>
            <td><label>Total Micron</label></td>
            <td class="has-input"><input type="text" value="0.000.000"></td>
            <td><label>Grams Per Piece</label></td>
            <td class="has-input"><input type="text" value="0.000.000"></td>
            <td><label>Order Quantity In Kg</label></td>
            <td class="has-input"><input type="text" value="0.000.000"></td>
            </tr>
            <tr>
            <td><label>Total GSM</label></td>
            <td class="has-input"><input type="text" value="0.000.000"></td>
            <td><label>Square Meter Per Kg</label></td>
            <td class="has-input"><input type="text" value="0.000.000"></td>
            <td><label>Order Quantity In Kpieces</label></td>
            <td class="has-input"><input type="text" value="0.000.000"></td>
            </tr>
            <tr>
            <td><label>Total Cost / M</label></td>
            <td class="has-input"><input type="text" value="0.000.000"></td>
            <td><label>Liner Meter Per Kg Film Width</label></td>
            <td class="has-input"><input type="text" value="0.000.000"></td>
            <td><label>Order Quantity In Meter (Film Width)</label></td>
            <td class="has-input"><input type="text" value="0.000.000"></td>
            </tr>
        </tbody>
        </table>
    </div>

    <div class="oc-table mt-5">
        <h2 class="h2 pb-3">Operation Cost</h2>
        <div class="table-responsive">
            <table class="table table-bordered align-middle">
                <thead>
                <tr>
                    <th></th>
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
                        <input type="checkbox" class="form-check-input">
                        <span>Extrusion</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="000 Kgs/Hr" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                    <td rowspan="10" class="total-cost has-input"><input type="text" value="0.00"></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input">
                        <span>Printing</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="000 Kgs/Hr" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input">
                        <span>rewinding</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="000 Kgs/Hr" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input">
                        <span>lamination 1</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="000 Kgs/Hr" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input">
                        <span>lamination 2</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="000 Kgs/Hr" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input">
                        <span>lamination 3</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="000 Kgs/Hr" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input">
                        <span>Slitting</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="000 Kgs/Hr" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input">
                        <span>Sleeving</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="000 Kgs/Hr" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                </tr>
                <tr>
                    <td class="has-checkbox checkbox-field">
                    <label class="checkbox-label">
                        <input type="checkbox" class="form-check-input">
                        <span>Doctoring</span>
                    </label>
                    </td>
                    <td class="has-input"><input type="text" value="000 Kgs/Hr" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
                    <td class="has-input"><input type="text" value="0.00" class="blue-field"></td>
                    <td class="has-input"><input type="text" value="0.00"></td>
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
                    <th></th>
                    <th>raw merterial cost</th>
                    <th class="th-has-tag"><span>Markup</span>0.00%</th>
                    <th>Plates / cylinders cost</th>
                    <th>Delivery Cost</th>
                    <th>operation cost</th>
                    <th>Sale Price</th>
                </tr>
                </thead>
                
                <tbody>
                <tr>
                    <td class="has-label"><label>per kg</label></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000" class="blue-field"></td>
                    <td class="has-input"><input type="number" value="0.0000" class="blue-field"></td>
                    <td class="has-input"><input type="number" value="0.0000" class="blue-field"></td>
                    <td class="has-input"><input type="number" value="0.0000" class="blue-field"></td>
                </tr>
                <tr>
                    <td class="has-label"><label>per kpcs</label></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000" class="blue-field"></td>
                </tr>
                <tr>
                    <td class="has-label"><label>per SQM</label></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000" class="blue-field"></td>
                </tr>
                <tr>
                    <td class="has-label"><label>per LM</label></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000"></td>
                    <td class="has-input"><input type="number" value="0.0000" class="blue-field"></td>
                </tr>
                </tbody>
            </table>
        </div>
    </div>


    </div> <!-- container div end -->
    </section>

@endsection




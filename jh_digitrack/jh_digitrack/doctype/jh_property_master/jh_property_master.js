// Copyright (c) 2026, Bytsolv and contributors
// For license information, please see license.txt

function set_property_division_options(frm) {
    frappe.db.get_list('JH Property Division', {
        fields: ['business_used', 'division_used'],
        limit_page_length: 500,
        order_by: 'modified desc'
    }).then(rows => {
        const unique_options = (fieldname) => {
            const values = [
                frm.doc[fieldname],
                ...rows.map(row => row[fieldname])
            ].filter(value => value);

            return ['', ...new Set(values)].sort().join('\n');
        };

        frm.set_df_property('business_used', 'options', unique_options('business_used'));
        frm.set_df_property('division_used', 'options', unique_options('division_used'));
        frm.refresh_field('business_used');
        frm.refresh_field('division_used');
    });
}

frappe.ui.form.on('JH Property Master', {

    refresh(frm) {
        jh_attach_sanitizer(frm, [
            'property_name', 'booked_under', 'profit_center', 'premise_number',
            'staff_allocated', 'location', 'emirate', 'country', 'makani_number',
            'po_box_number', 'landlord', 'real_estate', 'tenancy_period',
            'internet_connection'
        ]);
        set_property_division_options(frm);
    },

    onload(frm) {
        set_property_division_options(frm);
    },

});

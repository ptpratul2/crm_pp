import click
import frappe
from frappe.commands import pass_context


@click.command('setup-city-field')
@pass_context
def setup_city_field(context):
    """Setup city field as Select field for Lead and Opportunity"""
    site = context.sites[0] if context.sites else None
    
    if not site:
        click.echo("Please specify a site")
        return
    
    frappe.init(site=site)
    frappe.connect()
    
    from crm_pp.crm_pp.city_state_setup import setup_all_doctypes
    
    click.echo("Setting up city field...")
    setup_all_doctypes()
    click.echo("Done!")
    
    frappe.destroy()


commands = [
    setup_city_field
]



